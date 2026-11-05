import { pickClientEditableUserMetadata } from '@quizaroni/shared-types';
import { z } from 'zod';

export type JsonObject = Record<string, unknown>;

// What the Logto sign-up webhook seeded, so a new profile looks the same here.
export const DEFAULT_USER_METADATA: Readonly<JsonObject> = Object.freeze({
    defaultTheme: 'dark',
    homeView: 'table',
    namedColors: [],
    visibleColumns: {},
    preferredDateFormat: 'MM/DD/YYYY',
    defaultDownloadFormat: 'JSON',
});

// Preset avatars are SVG data URIs of up to ~36 KB; real settings are far smaller.
export const MAX_UPDATES_BYTES = 128 * 1024;
// DynamoDB's item limit, which the stored metadata had to fit before.
export const MAX_METADATA_BYTES = 400 * 1024;
export const MAX_VALUE_DEPTH = 16;

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isPlainObject(value: unknown): value is JsonObject {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

// Depth is checked before descending, so arbitrarily deep input never recurses
// past MAX_VALUE_DEPTH.
export function isStorableValue(value: unknown, depth = 0): boolean {
    if (depth > MAX_VALUE_DEPTH) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) {
        return value.every((item) => isStorableValue(item, depth + 1));
    }
    if (isPlainObject(value)) {
        return Object.values(value).every((item) =>
            isStorableValue(item, depth + 1)
        );
    }
    return true;
}

export type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; status: 400 | 413; message: string };

function checkUpdates(updates: JsonObject): ParseResult<JsonObject> {
    if (!isStorableValue(updates)) {
        return { ok: false, status: 400, message: 'Invalid updates' };
    }
    if (Buffer.byteLength(JSON.stringify(updates)) > MAX_UPDATES_BYTES) {
        return { ok: false, status: 413, message: 'Updates too large' };
    }
    return { ok: true, value: updates };
}

// Keys outside the allowlist are dropped, not rejected, so older clients that
// send their whole metadata object still save.
export function parseMetadataUpdates(raw: unknown): ParseResult<JsonObject> {
    if (!isPlainObject(raw)) {
        return { ok: false, status: 400, message: 'Invalid updates' };
    }
    return checkUpdates(pickClientEditableUserMetadata(raw));
}

export function parseNotificationUpdates(
    raw: unknown
): ParseResult<JsonObject> {
    if (!isPlainObject(raw)) {
        return { ok: false, status: 400, message: 'Invalid updates' };
    }
    return checkUpdates(raw);
}

// Objects merge, arrays and scalars replace, `undefined` is skipped.
export function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
    const result: JsonObject = { ...target };
    for (const [key, sourceValue] of Object.entries(source)) {
        if (UNSAFE_KEYS.has(key) || sourceValue === undefined) continue;
        const targetValue = result[key];
        result[key] =
            isPlainObject(sourceValue) && isPlainObject(targetValue)
                ? deepMerge(targetValue, sourceValue)
                : sourceValue;
    }
    return result;
}

export const GamificationStateSchema = z.object({
    currentStreak: z.number(),
    longestStreak: z.number(),
    lastStudyDate: z.string().nullable(),
    unlockedAchievementIds: z.array(z.string()),
    unlockedAtById: z.record(z.string(), z.string()),
    studiedStudysetUUIDs: z.array(z.string()),
    studysetSessionCounts: z.record(z.string(), z.number()),
});

export const CustomAchievementSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    metric: z.enum([
        'daily_streak',
        'total_sessions',
        'total_cards',
        'session_streak',
        'perfect_session',
        'studyset_sessions',
    ]),
    threshold: z.number(),
    studysetUUID: z.string().optional(),
    createdAt: z.iso.datetime(),
    unlockedAt: z.iso.datetime().optional(),
});

export const UpdateGamificationBodySchema = z.object({
    gamification: GamificationStateSchema,
    customAchievements: z.array(CustomAchievementSchema),
});

export type GamificationState = z.infer<typeof GamificationStateSchema>;
export type CustomAchievement = z.infer<typeof CustomAchievementSchema>;

export function emptyGamification(): GamificationState {
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        unlockedAchievementIds: [],
        unlockedAtById: {},
        studiedStudysetUUIDs: [],
        studysetSessionCounts: {},
    };
}

function mergeStreakFields(
    local: GamificationState,
    remote: GamificationState
): Pick<GamificationState, 'currentStreak' | 'lastStudyDate'> {
    if (!local.lastStudyDate && !remote.lastStudyDate) {
        return { currentStreak: 0, lastStudyDate: null };
    }
    if (!local.lastStudyDate) {
        return {
            currentStreak: remote.currentStreak,
            lastStudyDate: remote.lastStudyDate,
        };
    }
    if (!remote.lastStudyDate) {
        return {
            currentStreak: local.currentStreak,
            lastStudyDate: local.lastStudyDate,
        };
    }
    if (local.lastStudyDate > remote.lastStudyDate) {
        return {
            currentStreak: local.currentStreak,
            lastStudyDate: local.lastStudyDate,
        };
    }
    if (remote.lastStudyDate > local.lastStudyDate) {
        return {
            currentStreak: remote.currentStreak,
            lastStudyDate: remote.lastStudyDate,
        };
    }
    return {
        currentStreak: Math.max(local.currentStreak, remote.currentStreak),
        lastStudyDate: local.lastStudyDate,
    };
}

// Keys come from clients, so a key like `constructor` must not read the
// inherited Object member.
function own<T>(record: Record<string, T>, key: string): T | undefined {
    return Object.hasOwn(record, key) ? record[key] : undefined;
}

export function mergeGamificationState(
    local: GamificationState,
    remote: GamificationState
): GamificationState {
    const unlockedAchievementIds = [
        ...new Set([
            ...local.unlockedAchievementIds,
            ...remote.unlockedAchievementIds,
        ]),
    ];

    const unlockedAtById = {
        ...local.unlockedAtById,
        ...remote.unlockedAtById,
    };
    for (const id of unlockedAchievementIds) {
        const localAt = own(local.unlockedAtById, id);
        const remoteAt = own(remote.unlockedAtById, id);
        if (localAt && remoteAt) {
            unlockedAtById[id] = localAt < remoteAt ? localAt : remoteAt;
        }
    }

    const studysetSessionCounts = { ...local.studysetSessionCounts };
    for (const [uuid, count] of Object.entries(remote.studysetSessionCounts)) {
        studysetSessionCounts[uuid] = Math.max(
            count,
            own(studysetSessionCounts, uuid) ?? 0
        );
    }

    return {
        ...mergeStreakFields(local, remote),
        longestStreak: Math.max(local.longestStreak, remote.longestStreak),
        unlockedAchievementIds,
        unlockedAtById,
        studiedStudysetUUIDs: [
            ...new Set([
                ...local.studiedStudysetUUIDs,
                ...remote.studiedStudysetUUIDs,
            ]),
        ],
        studysetSessionCounts,
    };
}

function earlier(a: string, b: string): string {
    return a < b ? a : b;
}

export function mergeCustomAchievements(
    local: CustomAchievement[],
    remote: CustomAchievement[]
): CustomAchievement[] {
    const byId = new Map<string, CustomAchievement>();
    for (const achievement of [...local, ...remote]) {
        const existing = byId.get(achievement.id);
        if (!existing) {
            byId.set(achievement.id, achievement);
            continue;
        }
        const unlockedAt =
            existing.unlockedAt && achievement.unlockedAt
                ? earlier(existing.unlockedAt, achievement.unlockedAt)
                : (existing.unlockedAt ?? achievement.unlockedAt);
        byId.set(achievement.id, {
            ...existing,
            ...achievement,
            unlockedAt,
            createdAt: earlier(existing.createdAt, achievement.createdAt),
        });
    }
    return [...byId.values()];
}
