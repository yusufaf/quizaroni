import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { closeDatabase, type Db, openDatabase } from '../db';
import { account, session, user, userProfile } from '../db/schema';
import { createStudyset, getStudyset } from '../studysets/store';
import { emptyGamification, MAX_METADATA_BYTES } from './metadata';
import {
    buildUserDataExport,
    ensureProfile,
    getUserView,
    MetadataTooLargeError,
    updateGamification,
    updateMetadata,
    updateNotificationPreferences,
    updateUsername,
} from './profile';

let root: string | undefined;
let sqlite: Database | undefined;

function freshDb(): Db {
    root = mkdtempSync(join(tmpdir(), 'qz-profile-'));
    const opened = openDatabase(root);
    sqlite = opened.sqlite;
    return opened.db;
}

afterEach(() => {
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

const T0 = new Date('2026-11-01T10:00:00.000Z');
const T1 = new Date('2026-11-02T10:00:00.000Z');

function addUser(db: Db, id: string, email = `${id}@example.com`): string {
    db.insert(user)
        .values({
            id,
            name: `Name ${id}`,
            email,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    return id;
}

function profileRow(db: Db, id: string) {
    return db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, id))
        .get();
}

describe('ensureProfile', () => {
    test('creates the defaults once and keeps later edits', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        ensureProfile(db, id, T0);
        expect(profileRow(db, id)).toMatchObject({
            username: null,
            labels: [],
            metadata: {
                defaultTheme: 'dark',
                homeView: 'table',
                namedColors: [],
                visibleColumns: {},
                preferredDateFormat: 'MM/DD/YYYY',
                defaultDownloadFormat: 'JSON',
            },
        });
        updateMetadata(db, id, { homeView: 'grid' }, T1);
        ensureProfile(db, id, T1);
        expect(profileRow(db, id)?.metadata.homeView).toBe('grid');
    });
});

describe('getUserView', () => {
    test('returns the Lambda shape for a fresh user', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        expect(getUserView(db, id, T1)).toEqual({
            userUUID: id,
            email: 'u1@example.com',
            emailVerified: false,
            username: null,
            labels: [],
            metadata: expect.objectContaining({ defaultTheme: 'dark' }),
            createdAt: T0.toISOString(),
            updatedAt: T1.toISOString(),
        });
    });

    test('does not write when the profile exists', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        getUserView(db, id, T0);
        getUserView(db, id, T1);
        expect(profileRow(db, id)?.updatedAt).toEqual(T0);
    });
});

describe('writes before the first read', () => {
    test('updateUsername persists', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        expect(updateUsername(db, id, 'ada')).toMatchObject({ status: 'ok' });
        expect(profileRow(db, id)?.username).toBe('ada');
    });

    test('updateMetadata persists', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateMetadata(db, id, { homeView: 'grid' });
        expect(profileRow(db, id)?.metadata.homeView).toBe('grid');
    });

    test('updateNotificationPreferences persists', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateNotificationPreferences(db, id, { email: { enabled: true } });
        expect(profileRow(db, id)?.metadata.notifications).toEqual({
            email: { enabled: true },
        });
    });

    test('updateGamification persists', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateGamification(db, id, {
            gamification: { ...emptyGamification(), longestStreak: 4 },
            customAchievements: [],
        });
        expect(profileRow(db, id)?.metadata.gamification).toMatchObject({
            longestStreak: 4,
        });
    });
});

describe('updateMetadata', () => {
    test('keeps earlier keys and bumps updatedAt', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateMetadata(db, id, { homeView: 'grid' }, T0);
        const view = updateMetadata(db, id, { defaultTheme: 'light' }, T1);
        expect(view.metadata).toMatchObject({
            homeView: 'grid',
            defaultTheme: 'light',
        });
        expect(view.updatedAt).toBe(T1.toISOString());
    });

    test('refuses to store more than the cap and leaves the row alone', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        getUserView(db, id, T0);
        const before = profileRow(db, id);
        expect(() =>
            updateMetadata(db, id, {
                avatar: 'x'.repeat(MAX_METADATA_BYTES),
            })
        ).toThrow(MetadataTooLargeError);
        expect(profileRow(db, id)).toEqual(before);
    });
});

describe('updateUsername', () => {
    test('is unique regardless of letter case', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        updateUsername(db, a, 'alice');
        getUserView(db, b, T0);
        expect(updateUsername(db, b, 'ALICE')).toEqual({ status: 'taken' });
        expect(profileRow(db, a)?.username).toBe('alice');
        expect(profileRow(db, b)?.username).toBeNull();
    });

    test('lets a user change the case of their own name', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        updateUsername(db, a, 'alice');
        const result = updateUsername(db, a, 'Alice');
        expect(result).toMatchObject({
            status: 'ok',
            user: { username: 'Alice' },
        });
    });

    test("restamps the author on the user's sets only", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        updateUsername(db, b, 'bob');
        const sets = [createStudyset(db, a), createStudyset(db, a)].map(
            (r) => (r.status === 'ok' ? r.studyset.studysetUUID : '')
        );
        const bSet = createStudyset(db, b);
        const result = updateUsername(db, a, 'ada');
        expect(result).toMatchObject({ status: 'ok', studysetsUpdated: 2 });
        for (const id of sets) {
            expect(getStudyset(db, a, id)?.username).toBe('ada');
        }
        if (bSet.status !== 'ok') throw new Error('create failed');
        expect(
            getStudyset(db, b, bSet.studyset.studysetUUID)?.username
        ).toBe('bob');
    });

    test('a taken name leaves the author on the sets unchanged', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        updateUsername(db, a, 'alice');
        updateUsername(db, b, 'bob');
        const set = createStudyset(db, b);
        if (set.status !== 'ok') throw new Error('create failed');
        expect(updateUsername(db, b, 'ALICE')).toEqual({ status: 'taken' });
        expect(
            getStudyset(db, b, set.studyset.studysetUUID)?.username
        ).toBe('bob');
    });

    test('allows many users without a username', () => {
        const db = freshDb();
        for (const id of ['a', 'b', 'c']) getUserView(db, addUser(db, id));
        const rows = db.select().from(userProfile).all();
        expect(rows.map((r) => r.username)).toEqual([null, null, null]);
    });
});

describe('updateNotificationPreferences', () => {
    test('deep-merges into the stored preferences', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateNotificationPreferences(db, id, {
            email: { enabled: false, weeklyDigest: true },
        });
        const view = updateNotificationPreferences(db, id, {
            email: { enabled: true },
        });
        expect(view.metadata.notifications).toEqual({
            email: { enabled: true, weeklyDigest: true },
        });
    });
});

describe('updateGamification', () => {
    test('merges with the stored state and returns the result', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        updateGamification(db, id, {
            gamification: {
                ...emptyGamification(),
                longestStreak: 9,
                unlockedAchievementIds: ['a'],
            },
            customAchievements: [],
        });
        const result = updateGamification(db, id, {
            gamification: {
                ...emptyGamification(),
                longestStreak: 2,
                unlockedAchievementIds: ['b'],
            },
            customAchievements: [],
        });
        expect(result.gamification).toMatchObject({
            longestStreak: 9,
            unlockedAchievementIds: ['a', 'b'],
        });
        expect(result.user.metadata.gamification).toEqual(result.gamification);
    });

    test('treats junk stored state as empty', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        getUserView(db, id);
        db.update(userProfile)
            .set({
                metadata: { gamification: 'junk', customAchievements: 7 },
            })
            .where(eq(userProfile.userId, id))
            .run();
        const result = updateGamification(db, id, {
            gamification: { ...emptyGamification(), longestStreak: 1 },
            customAchievements: [],
        });
        expect(result.gamification.longestStreak).toBe(1);
        expect(result.customAchievements).toEqual([]);
    });
});

describe('buildUserDataExport', () => {
    test('holds the profile and no secrets', () => {
        const db = freshDb();
        const id = addUser(db, 'u1');
        db.insert(account)
            .values({
                id: 'acc1',
                accountId: id,
                providerId: 'credential',
                userId: id,
                password: '$argon2id$secret-hash',
                createdAt: T0,
                updatedAt: T0,
            })
            .run();
        db.insert(session)
            .values({
                id: 's1',
                token: 'session-token-value',
                expiresAt: T1,
                createdAt: T0,
                updatedAt: T0,
                userId: id,
            })
            .run();
        updateMetadata(db, id, { homeView: 'grid' });

        const exported = buildUserDataExport(db, id, { now: T1 });
        expect(exported).toMatchObject({
            format: 'quizaroni-user-data',
            version: 1,
            exportedAt: T1.toISOString(),
            user: {
                userUUID: id,
                name: 'Name u1',
                role: 'user',
                metadata: expect.objectContaining({ homeView: 'grid' }),
            },
        });
        expect(exported).not.toHaveProperty('studysets');
        const text = JSON.stringify(exported);
        expect(text).not.toContain('argon2');
        expect(text).not.toContain('session-token-value');
    });

    test("adds the user's own sets when asked", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        const own = createStudyset(db, a);
        createStudyset(db, b);
        if (own.status !== 'ok') throw new Error('create failed');
        const exported = buildUserDataExport(db, a, {
            includeStudysets: true,
        });
        expect(exported.studysets).toEqual([own.studyset]);
    });
});

test('deleting the user removes the profile', () => {
    const db = freshDb();
    const id = addUser(db, 'u1');
    getUserView(db, id);
    db.delete(user).where(eq(user.id, id)).run();
    expect(profileRow(db, id)).toBeUndefined();
});
