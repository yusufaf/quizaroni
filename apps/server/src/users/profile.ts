import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { isUniqueViolation } from '../db/errors';
import { user, userProfile } from '../db/schema';
import {
    listStudysets,
    restampAuthor,
    type StudysetView,
} from '../studysets/store';
import {
    type CustomAchievement,
    CustomAchievementSchema,
    deepMerge,
    DEFAULT_USER_METADATA,
    emptyGamification,
    type GamificationState,
    GamificationStateSchema,
    isPlainObject,
    type JsonObject,
    MAX_METADATA_BYTES,
    mergeCustomAchievements,
    mergeGamificationState,
    UNSAFE_KEYS,
    withUserMetadataDefaults,
} from './metadata';

// The shape the Lambdas returned (the Dynamo row minus its keys), so the web
// client's schemas accept it unchanged.
export type UserView = {
    userUUID: string;
    email: string;
    emailVerified: boolean;
    username: string | null;
    labels: string[];
    metadata: JsonObject;
    createdAt: string;
    updatedAt: string;
};

export type UserDataExport = {
    format: 'quizaroni-user-data';
    version: 1;
    exportedAt: string;
    user: UserView & { name: string; role: string };
    studysets?: StudysetView[];
};

export class MetadataTooLargeError extends Error {
    constructor() {
        super('Metadata too large');
        this.name = 'MetadataTooLargeError';
    }
}

type Conn = Pick<Db, 'select' | 'insert' | 'update'>;
type ProfileRow = typeof userProfile.$inferSelect;
type UserRow = typeof user.$inferSelect;

function selectRows(
    conn: Conn,
    userId: string
): { account: UserRow; profile: ProfileRow | null } {
    const row = conn
        .select({ account: user, profile: userProfile })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id))
        .where(eq(user.id, userId))
        .get();
    // Callers pass the id of a live session, so the user row exists.
    if (!row) throw new Error('User not found');
    return row;
}

function toView(account: UserRow, profile: ProfileRow): UserView {
    return {
        userUUID: account.id,
        email: account.email,
        emailVerified: account.emailVerified,
        username: profile.username,
        labels: profile.labels,
        metadata: withUserMetadataDefaults(profile.metadata),
        createdAt: account.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
    };
}

// Profiles are created on first use, which covers sign-ups, the setup
// wizard's admin and imported users alike.
export function ensureProfile(tx: Conn, userId: string, now: Date): void {
    tx.insert(userProfile)
        .values({
            userId,
            username: null,
            metadata: structuredClone(DEFAULT_USER_METADATA) as JsonObject,
            labels: [],
            updatedAt: now,
        })
        .onConflictDoNothing()
        .run();
}

function readProfile(
    conn: Conn,
    userId: string
): { account: UserRow; profile: ProfileRow } {
    const { account, profile } = selectRows(conn, userId);
    if (!profile) throw new Error('Profile not found');
    return { account, profile };
}

// Reads don't take the write lock unless the profile is still missing.
export function getUserView(db: Db, userId: string, now = new Date()): UserView {
    const { account, profile } = selectRows(db, userId);
    if (profile) return toView(account, profile);
    return db.transaction(
        (tx) => {
            ensureProfile(tx, userId, now);
            const read = readProfile(tx, userId);
            return toView(read.account, read.profile);
        },
        { behavior: 'immediate' }
    );
}

// BEGIN IMMEDIATE takes the write lock before the read, so two tabs or
// processes writing at once can't lose each other's changes.
function writeProfile<T>(
    db: Db,
    userId: string,
    now: Date,
    write: (tx: Conn, profile: ProfileRow) => T
): T {
    return db.transaction(
        (tx) => {
            ensureProfile(tx, userId, now);
            return write(tx, readProfile(tx, userId).profile);
        },
        { behavior: 'immediate' }
    );
}

function viewAfterWrite(tx: Conn, userId: string): UserView {
    const { account, profile } = readProfile(tx, userId);
    return toView(account, profile);
}

function writeMetadata(
    tx: Conn,
    userId: string,
    metadata: JsonObject,
    now: Date
): void {
    if (Buffer.byteLength(JSON.stringify(metadata)) > MAX_METADATA_BYTES) {
        throw new MetadataTooLargeError();
    }
    tx.update(userProfile)
        .set({ metadata, updatedAt: now })
        .where(eq(userProfile.userId, userId))
        .run();
}

const MAX_THEME_ACCENTS = 64;
const MAX_THEME_ACCENT_LENGTH = 64;

// Accents are per theme, so one device's pick must not drop another's. Merged
// entries are never pruned, so only short string pairs are kept and new
// themes stop being added past a cap.
function mergeThemeAccents(stored: unknown, incoming: JsonObject): JsonObject {
    const base = isPlainObject(stored) ? stored : {};
    let room = MAX_THEME_ACCENTS - Object.keys(base).length;
    const accepted = Object.entries(incoming).filter(([key, value]) => {
        if (
            UNSAFE_KEYS.has(key) ||
            key.length > MAX_THEME_ACCENT_LENGTH ||
            typeof value !== 'string' ||
            value.length === 0 ||
            value.length > MAX_THEME_ACCENT_LENGTH
        ) {
            return false;
        }
        if (Object.hasOwn(base, key)) return true;
        if (room <= 0) return false;
        room -= 1;
        return true;
    });
    return deepMerge(base, Object.fromEntries(accepted));
}

export function updateMetadata(
    db: Db,
    userId: string,
    updates: JsonObject,
    now = new Date()
): UserView {
    return writeProfile(db, userId, now, (tx, profile) => {
        const merged: JsonObject = { ...profile.metadata, ...updates };
        if (isPlainObject(updates.themeAccents)) {
            merged.themeAccents = mergeThemeAccents(
                profile.metadata.themeAccents,
                updates.themeAccents
            );
        } else if ('themeAccents' in updates) {
            // A malformed value must not wipe every theme's accent.
            if ('themeAccents' in profile.metadata) {
                merged.themeAccents = profile.metadata.themeAccents;
            } else {
                delete merged.themeAccents;
            }
        }
        writeMetadata(tx, userId, merged, now);
        return viewAfterWrite(tx, userId);
    });
}

export function updateNotificationPreferences(
    db: Db,
    userId: string,
    updates: JsonObject,
    now = new Date()
): UserView {
    return writeProfile(db, userId, now, (tx, profile) => {
        const stored = profile.metadata.notifications;
        const notifications = deepMerge(
            isPlainObject(stored) ? stored : {},
            updates
        );
        writeMetadata(tx, userId, { ...profile.metadata, notifications }, now);
        return viewAfterWrite(tx, userId);
    });
}

export function updateGamification(
    db: Db,
    userId: string,
    input: {
        gamification: GamificationState;
        customAchievements: CustomAchievement[];
    },
    now = new Date()
): {
    gamification: GamificationState;
    customAchievements: CustomAchievement[];
    user: UserView;
} {
    return writeProfile(db, userId, now, (tx, profile) => {
        // A stored value that no longer fits the schema counts as empty.
        const storedGamification = GamificationStateSchema.safeParse(
            profile.metadata.gamification
        );
        const storedCustom = CustomAchievementSchema.array().safeParse(
            profile.metadata.customAchievements
        );
        const gamification = mergeGamificationState(
            storedGamification.success
                ? storedGamification.data
                : emptyGamification(),
            input.gamification
        );
        const customAchievements = mergeCustomAchievements(
            storedCustom.success ? storedCustom.data : [],
            input.customAchievements
        );
        writeMetadata(
            tx,
            userId,
            { ...profile.metadata, gamification, customAchievements },
            now
        );
        return {
            gamification,
            customAchievements,
            user: viewAfterWrite(tx, userId),
        };
    });
}

export function updateUsername(
    db: Db,
    userId: string,
    username: string,
    now = new Date()
):
    | { status: 'ok'; user: UserView; studysetsUpdated: number }
    | { status: 'taken' } {
    try {
        // The author name on the user's sets changes in the same transaction,
        // so a taken name rolls both back.
        const updated = writeProfile(db, userId, now, (tx) => {
            tx.update(userProfile)
                .set({ username, updatedAt: now })
                .where(eq(userProfile.userId, userId))
                .run();
            return {
                user: viewAfterWrite(tx, userId),
                studysetsUpdated: restampAuthor(tx, userId, username),
            };
        });
        return { status: 'ok', ...updated };
    } catch (err) {
        // The NOCASE unique index decides races; the transaction rolled back.
        if (isUniqueViolation(err)) return { status: 'taken' };
        throw err;
    }
}

// The profile, plus the user's own study sets when asked. Never includes
// password hashes, sessions or accounts.
export function buildUserDataExport(
    db: Db,
    userId: string,
    options: { includeStudysets?: boolean; now?: Date } = {}
): UserDataExport {
    const now = options.now ?? new Date();
    const view = getUserView(db, userId, now);
    const { account } = selectRows(db, userId);
    return {
        format: 'quizaroni-user-data',
        version: 1,
        exportedAt: now.toISOString(),
        user: { ...view, name: account.name, role: account.role },
        ...(options.includeStudysets
            ? { studysets: listStudysets(db, userId) }
            : {}),
    };
}
