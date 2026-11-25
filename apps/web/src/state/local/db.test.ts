import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import { getDatabase, resetDatabase } from './db';
import { GAMIFICATION_DB_ID } from 'shared/constants';
import { createInitialGamificationState } from 'shared/utilities/gamification';
import { newProgress } from 'shared/utilities/srs';

// Assigning TZ re-reads the zone; deleting it does not, so restore by name.
const useTimeZone = (zone: string) => {
    const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let previous: string | undefined;
    beforeAll(() => {
        previous = process.env.TZ;
        process.env.TZ = zone;
    });
    afterAll(() => {
        process.env.TZ = previous ?? host;
    });
};

// Schema and SM-2 rows as stored before the FSRS migration.
async function seedV4(): Promise<void> {
    const v4 = new Dexie('quizaroni_v1');
    v4.version(4).stores({
        studysets:
            'studysetUUID, userUUID, _syncStatus, _lastModified, labels, lastViewed',
        users: 'userUUID, _syncStatus, _lastModified',
        sessions: 'sessionUUID, studysetUUID, completedAt, _syncStatus',
        cardProgress:
            'cardUUID, studysetUUID, nextReview, _syncStatus, [studysetUUID+nextReview]',
        gamification: 'id',
        customAchievements: 'id, unlockedAt',
        aiChatHistory: 'studysetUUID, updatedAt',
        syncQueue: '++id, entityType, entityId, createdAt',
    });
    await v4.table('cardProgress').bulkPut([
        {
            cardUUID: 'c1',
            studysetUUID: 's1',
            easeFactor: 2.5,
            interval: 6,
            repetitions: 2,
            lastStudied: '2026-01-01T00:00:00.000Z',
            nextReview: '2026-01-07T00:00:00.000Z',
            masteryLevel: 'learning',
            _syncStatus: 'pending',
            _lastModified: 1,
        },
        {
            cardUUID: 'c2',
            studysetUUID: 's2',
            easeFactor: 1.3,
            interval: 1,
            repetitions: 0,
            lastStudied: '2026-01-01T00:00:00.000Z',
            nextReview: '2026-01-02T00:00:00.000Z',
            masteryLevel: 'learning',
            _syncStatus: 'pending',
            _lastModified: 1,
        },
    ]);
    v4.close();
}

// A v5 database with a streak stored under a UTC day key (before #160).
async function seedV5(
    lastStudyDate: string | null,
    lastModified: number
): Promise<void> {
    const v5 = new Dexie('quizaroni_v1');
    v5.version(5).stores({
        studysets:
            'studysetUUID, userUUID, _syncStatus, _lastModified, labels, lastViewed',
        users: 'userUUID, _syncStatus, _lastModified',
        sessions: 'sessionUUID, studysetUUID, completedAt, _syncStatus',
        cardProgress:
            'cardUUID, studysetUUID, nextReview, _syncStatus, [studysetUUID+nextReview]',
        gamification: 'id',
        customAchievements: 'id, unlockedAt',
        aiChatHistory: 'studysetUUID, updatedAt',
        syncQueue: '++id, entityType, entityId, createdAt',
    });
    await v5.table('gamification').put({
        id: GAMIFICATION_DB_ID,
        ...createInitialGamificationState(),
        currentStreak: 4,
        longestStreak: 4,
        lastStudyDate,
        _lastModified: lastModified,
    });
    v5.close();
}

afterEach(resetDatabase);

describe('Dexie v5 FSRS migration', () => {
    it('converts SM-2 card progress from a v4 database', async () => {
        await seedV4();
        const db = getDatabase();
        await db.open();
        expect(db.verno).toBe(6);

        const c1 = await db.cardProgress.get('c1');
        const c2 = await db.cardProgress.get('c2');
        expect(c1).toMatchObject({
            state: 'Review',
            stability: 6,
            nextReview: '2026-01-07T00:00:00.000Z',
            studysetUUID: 's1',
            _syncStatus: 'pending',
        });
        expect(c1!.difficulty).toBeCloseTo(7.2474, 3);
        expect(c1).not.toHaveProperty('easeFactor');
        expect(c2).toMatchObject({
            state: 'Review',
            stability: 1,
            difficulty: 10,
            nextReview: '2026-01-02T00:00:00.000Z',
        });
    });

    it('keeps the studyset due-date index working', async () => {
        await seedV4();
        const db = getDatabase();
        await db.open();
        const due = await db.cardProgress
            .where('[studysetUUID+nextReview]')
            .between(['s1', ''], ['s1', '2026-01-08T00:00:00.000Z'], true, true)
            .toArray();
        expect(due.map((p) => p.cardUUID)).toEqual(['c1']);
    });

    it('opens a fresh install at v6', async () => {
        const db = getDatabase();
        await db.open();
        expect(db.verno).toBe(6);
        expect(await db.cardProgress.count()).toBe(0);

        const row = {
            ...newProgress('x'),
            studysetUUID: 's1',
            _syncStatus: 'pending' as const,
            _lastModified: 1,
        };
        await db.cardProgress.put(row);
        expect(await db.cardProgress.get('x')).toEqual(row);
    });
});

describe('Dexie v6 local-day streak migration', () => {
    describe('in Asia/Tokyo', () => {
        useTimeZone('Asia/Tokyo');

        it('moves a UTC key to the local day it was written on', async () => {
            await seedV5('2026-01-01', Date.parse('2026-01-01T23:00:00Z'));
            const db = getDatabase();
            await db.open();
            expect(db.verno).toBe(6);
            expect(await db.gamification.get(GAMIFICATION_DB_ID)).toMatchObject(
                { lastStudyDate: '2026-01-02', currentStreak: 4 }
            );
        });

        it('leaves a missing study day alone', async () => {
            await seedV5(null, Date.parse('2026-01-01T23:00:00Z'));
            const db = getDatabase();
            await db.open();
            expect(
                (await db.gamification.get(GAMIFICATION_DB_ID))?.lastStudyDate
            ).toBeNull();
        });
    });

    describe('in America/Los_Angeles', () => {
        useTimeZone('America/Los_Angeles');

        it('bounds the key by the local day of the last write', async () => {
            await seedV5('2026-01-01', Date.parse('2026-01-01T05:00:00Z'));
            const db = getDatabase();
            await db.open();
            expect(
                (await db.gamification.get(GAMIFICATION_DB_ID))?.lastStudyDate
            ).toBe('2025-12-31');
        });
    });
});
