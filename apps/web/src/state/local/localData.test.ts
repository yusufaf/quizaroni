// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { DEFAULT_USER_DATA } from 'shared/constants';
import type {
    CustomAchievement,
    StudySessionResult,
    StudyStatistics,
    User,
} from 'shared/types';
import { createInitialGamificationState } from 'shared/utilities/gamification';
import { newProgress } from 'shared/utilities/srs';
import {
    settleGamificationSync,
    useGamificationStore,
} from 'state/stores/gamification';
import { useStudySessionStore } from 'state/stores/studySession';
import { getDatabase } from './db';
import {
    claimLocalData,
    clearLocalData,
    hasUnsyncedLocalChanges,
} from './localData';
import {
    LOCAL_DATA_OWNER_KEY,
    handleOwnerStorageEvent,
    isClaimCurrent,
    markStoredOwnerSignedOut,
    readStoredOwner,
    setClaimedOwner,
    storedOwnerId,
    writeStoredOwner,
} from './owner';
import { cardProgressRepository } from './repositories';
import { gamificationRepository } from './repositories/GamificationRepository';
import { pushGamificationToServer } from './sync/gamificationSync';

const A_CUSTOM: CustomAchievement = {
    id: 'A-CUSTOM',
    title: 'A custom',
    description: 'Made by A',
    icon: '🏅',
    metric: 'total_sessions',
    threshold: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
};

const userB: User = {
    ...DEFAULT_USER_DATA,
    userUUID: 'user-B',
    metadata: {
        ...DEFAULT_USER_DATA.metadata,
        gamification: undefined,
        customAchievements: [],
    },
};

const session: StudySessionResult = {
    sessionUUID: 'session-1',
    studysetUUID: 'set-1',
    mode: 'flashcards',
    totalCards: 5,
    correctAnswers: 5,
    score: 500,
    timeSpent: 120,
    accuracy: 100,
    streak: 5,
    completedAt: '2026-06-05T12:00:00.000Z',
    achievements: [],
};

const stats: StudyStatistics = {
    totalSessions: 0,
    totalCardsStudied: 0,
    averageAccuracy: 0,
    totalTimeSpent: 0,
    achievements: [],
    progressByStudyset: new Map(),
};

const seedUserA = async () => {
    await gamificationRepository.saveState({
        ...createInitialGamificationState(),
        currentStreak: 42,
        longestStreak: 42,
        unlockedAchievementIds: ['A-ONLY-ACH'],
        unlockedAtById: { 'A-ONLY-ACH': '2026-01-01T00:00:00.000Z' },
    });
    await gamificationRepository.saveCustomAchievement(A_CUSTOM);
    await cardProgressRepository.upsert(newProgress('card-A'), 'set-A');
    await getDatabase().aiChatHistory.put({
        studysetUUID: 'set-A',
        messages: [],
        updatedAt: 1,
    });
};

type FetchInit = { body: string };

// Echoes the pushed payload back as the server's merged result.
const okFetch = () =>
    vi.fn(async (_url: string, init: FetchInit) => {
        const body = JSON.parse(init.body);
        return {
            ok: true,
            status: 200,
            json: async () => ({
                message: 'ok',
                gamification: body.gamification,
                customAchievements: body.customAchievements,
            }),
        };
    });

const pushedBodies = (fetchMock: ReturnType<typeof okFetch>) =>
    fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

const tableCounts = async () => {
    const db = getDatabase();
    const entries = await Promise.all(
        db.tables.map(async (t) => [t.name, await t.count()] as const)
    );
    return Object.fromEntries(entries);
};

describe('local data ownership', () => {
    let fetchMock: ReturnType<typeof okFetch>;
    let rejectPendingFetch: (() => void) | null = null;

    beforeEach(() => {
        fetchMock = okFetch();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(async () => {
        rejectPendingFetch?.();
        rejectPendingFetch = null;
        await settleGamificationSync();
        await clearLocalData();
        localStorage.clear();
        setClaimedOwner(null);
        vi.unstubAllGlobals();
    });

    it("a different account signing in sees and uploads none of the previous account's data", async () => {
        await claimLocalData('user-A');
        await seedUserA();
        await useGamificationStore.getState().hydrateFromDb();

        // A signs out.
        await clearLocalData();

        // New page load, B signs in.
        setClaimedOwner(null);
        await claimLocalData('user-B');
        await useGamificationStore.getState().hydrateFromDb();
        await useGamificationStore.getState().syncFromServer(userB);

        const counts = await tableCounts();
        for (const [name, count] of Object.entries(counts)) {
            expect(count, name).toBe(name === 'gamification' ? 1 : 0);
        }
        const store = useGamificationStore.getState();
        expect(store.state.longestStreak).toBe(0);
        expect(store.customAchievements).toEqual([]);

        const bodies = pushedBodies(fetchMock);
        expect(bodies).toHaveLength(1);
        expect(JSON.stringify(bodies[0])).not.toContain('A-ONLY-ACH');
        expect(JSON.stringify(bodies[0])).not.toContain('A-CUSTOM');
        expect(bodies[0].gamification.longestStreak).toBe(0);
    });

    it('a different account signing in wipes data left by a session that never signed out', async () => {
        await claimLocalData('user-A');
        await seedUserA();
        await useGamificationStore.getState().hydrateFromDb();

        setClaimedOwner(null);
        expect(await claimLocalData('user-B')).toBe(true);

        const counts = await tableCounts();
        for (const [name, count] of Object.entries(counts)) {
            expect(count, name).toBe(0);
        }
        expect(useGamificationStore.getState().state.longestStreak).toBe(0);
        expect(useGamificationStore.getState().customAchievements).toEqual([]);
        expect(readStoredOwner()).toBe('user-B');
    });

    it('the same account signing in again keeps its local data', async () => {
        await claimLocalData('user-A');
        await seedUserA();

        setClaimedOwner(null);
        expect(await claimLocalData('user-A')).toBe(false);

        expect(await cardProgressRepository.getByCard('card-A')).toBeDefined();
        expect((await gamificationRepository.getState()).longestStreak).toBe(
            42
        );
    });

    it('a device with no recorded owner resets its gamification but keeps card progress, AI chats and study stats', async () => {
        await seedUserA();
        useStudySessionStore.setState((s) => ({
            statistics: { ...s.statistics, totalSessions: 7 },
        }));
        await useGamificationStore.getState().hydrateFromDb();

        await claimLocalData('user-B');
        await useGamificationStore.getState().hydrateFromDb();
        await useGamificationStore.getState().syncFromServer(userB);

        const db = getDatabase();
        expect(await db.customAchievements.count()).toBe(0);
        const row = await gamificationRepository.getState();
        expect(row.longestStreak).toBe(0);
        expect(row.unlockedAchievementIds).not.toContain('A-ONLY-ACH');
        const store = useGamificationStore.getState();
        expect(store.state.longestStreak).toBe(0);
        expect(store.state.unlockedAchievementIds).toEqual([]);
        expect(store.customAchievements).toEqual([]);
        const bodies = pushedBodies(fetchMock);
        expect(JSON.stringify(bodies)).not.toContain('A-ONLY-ACH');
        expect(bodies[0].gamification.longestStreak).toBe(0);

        expect(await cardProgressRepository.getByCard('card-A')).toBeDefined();
        expect(await db.aiChatHistory.get('set-A')).toBeDefined();
        expect(useStudySessionStore.getState().statistics.totalSessions).toBe(
            7
        );
        expect(readStoredOwner()).toBe('user-B');
    });

    it('a device with no recorded owner and no data claims cleanly', async () => {
        await claimLocalData('user-A');

        expect(readStoredOwner()).toBe('user-A');
        expect(isClaimCurrent()).toBe(true);
    });

    it('repositories keep working after clearLocalData', async () => {
        await clearLocalData();

        await cardProgressRepository.upsert(newProgress('card-X'), 'set-X');
        expect(await cardProgressRepository.getByCard('card-X')).toBeDefined();
    });

    it('nothing is pushed before local data is claimed', async () => {
        const result = await pushGamificationToServer({
            state: createInitialGamificationState(),
            customAchievements: [],
        });

        expect(result).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a tab whose claim is stale pushes nothing', async () => {
        await claimLocalData('user-A');
        writeStoredOwner('user-B');

        const result = await pushGamificationToServer({
            state: createInitialGamificationState(),
            customAchievements: [],
        });

        expect(result).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a tab of the same account stops pushing after that account signs out in another tab', async () => {
        await claimLocalData('user-A');
        markStoredOwnerSignedOut();

        expect(readStoredOwner()).toBe('user-A:signed-out');
        expect(storedOwnerId()).toBe('user-A');
        expect(isClaimCurrent()).toBe(false);
        const result = await pushGamificationToServer({
            state: createInitialGamificationState(),
            customAchievements: [],
        });
        expect(result).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a tab reloads when another tab claims a different account', async () => {
        await claimLocalData('user-A');
        const reload = vi.fn();
        const event = (key: string, newValue: string) =>
            new StorageEvent('storage', { key, newValue });

        handleOwnerStorageEvent(event(LOCAL_DATA_OWNER_KEY, 'user-A'), reload);
        handleOwnerStorageEvent(
            event(LOCAL_DATA_OWNER_KEY, 'user-A:signed-out'),
            reload
        );
        handleOwnerStorageEvent(event('some-other-key', 'user-B'), reload);
        expect(reload).not.toHaveBeenCalled();

        handleOwnerStorageEvent(event(LOCAL_DATA_OWNER_KEY, 'user-B'), reload);
        expect(reload).toHaveBeenCalledOnce();
    });

    it('a push still in flight counts as unsynced', async () => {
        await claimLocalData('user-A');
        let reject!: (e: Error) => void;
        const pending = new Promise<never>((_, r) => {
            reject = r;
        });
        rejectPendingFetch = () => reject(new Error('aborted'));
        vi.stubGlobal(
            'fetch',
            vi.fn(() => pending)
        );

        useGamificationStore.getState().processSessionEnd(session, stats);

        expect(await hasUnsyncedLocalChanges({ timeoutMs: 50 })).toBe(true);
    });

    it('a push that lands before the timeout leaves nothing unsynced', async () => {
        await claimLocalData('user-A');

        useGamificationStore.getState().processSessionEnd(session, stats);

        expect(await hasUnsyncedLocalChanges({ timeoutMs: 2000 })).toBe(false);
        expect(useGamificationStore.getState().syncPending).toBe(false);
        expect(fetchMock).toHaveBeenCalled();
    });

    it('a failed push counts as unsynced', async () => {
        await claimLocalData('user-A');
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, status: 500 }))
        );

        useGamificationStore.getState().processSessionEnd(session, stats);

        expect(await hasUnsyncedLocalChanges({ timeoutMs: 2000 })).toBe(true);
    });
});

describe('clearLocalData and the files cache', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('drops the cached card files', async () => {
        const del = vi.fn().mockResolvedValue(true);
        vi.stubGlobal('caches', { delete: del });
        await clearLocalData();
        expect(del).toHaveBeenCalledWith('quizaroni-files');
    });

    it('copes without the Cache API', async () => {
        vi.stubGlobal('caches', undefined);
        Reflect.deleteProperty(globalThis, 'caches');
        await expect(clearLocalData()).resolves.toBeUndefined();
    });
});
