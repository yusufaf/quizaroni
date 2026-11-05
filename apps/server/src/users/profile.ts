import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { isUniqueViolation } from '../db/errors';
import { user, userProfile } from '../db/schema';
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
        metadata: profile.metadata,
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

export function updateMetadata(
    db: Db,
    userId: string,
    updates: JsonObject,
    now = new Date()
): UserView {
    return writeProfile(db, userId, now, (tx, profile) => {
        writeMetadata(tx, userId, { ...profile.metadata, ...updates }, now);
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
): { status: 'ok'; user: UserView } | { status: 'taken' } {
    try {
        const updated = writeProfile(db, userId, now, (tx) => {
            tx.update(userProfile)
                .set({ username, updatedAt: now })
                .where(eq(userProfile.userId, userId))
                .run();
            return viewAfterWrite(tx, userId);
        });
        return { status: 'ok', user: updated };
    } catch (err) {
        // The NOCASE unique index decides races; the transaction rolled back.
        if (isUniqueViolation(err)) return { status: 'taken' };
        throw err;
    }
}

// Only the profile for now: study sets join the export once the server
// stores them (#257). Never includes password hashes, sessions or accounts.
export function buildUserDataExport(
    db: Db,
    userId: string,
    now = new Date()
): UserDataExport {
    const view = getUserView(db, userId, now);
    const { account } = selectRows(db, userId);
    return {
        format: 'quizaroni-user-data',
        version: 1,
        exportedAt: now.toISOString(),
        user: { ...view, name: account.name, role: account.role },
    };
}
