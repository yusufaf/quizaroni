// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    DEFAULT_USER_DATA,
} from 'shared/constants';
import type { Studyset, User, UUID } from 'shared/types';
import { HttpError } from 'state/api/awsAPI';
import { getDatabase } from '../db';
import { claimLocalData, clearLocalData } from '../localData';
import { setClaimedOwner } from '../owner';
import { studysetRepository, userRepository } from '../repositories';
import { SyncEngine } from './SyncEngine';

afterEach(async () => {
    await clearLocalData();
    localStorage.clear();
    setClaimedOwner(null);
});

const apiClientWith = (
    updateUserMetadata: (updates: Record<string, unknown>) => Promise<unknown>
) => ({
    updateUserMetadata,
    updateStudyset: vi.fn(),
    createStudyset: vi.fn(),
    deleteStudyset: vi.fn(),
});

const set = (id: string) =>
    ({
        studysetUUID: id,
        userUUID: 'user-1',
        title: `Set ${id}`,
        description: '',
        labels: [],
        cards: [],
    }) as unknown as Studyset;

const fakeApi = () => ({
    updateUserMetadata: vi.fn().mockResolvedValue({}),
    updateStudyset: vi.fn().mockResolvedValue({}),
    createStudyset: vi.fn().mockResolvedValue({}),
    deleteStudyset: vi.fn().mockResolvedValue({}),
});

const pendingIds = async () =>
    (await studysetRepository.getPendingChanges()).map((s) => s.studysetUUID);

describe('SyncEngine', () => {
    it('syncs a pending user without the server-managed metadata keys (#207)', async () => {
        const editable = {
            ...DEFAULT_USER_DATA.metadata,
            defaultTheme: 'light' as const,
            namedColors: [{ color: '#000000', name: 'n' }],
        };
        const user: User = {
            ...DEFAULT_USER_DATA,
            userUUID: 'user-1',
            metadata: {
                ...editable,
                gamification: {
                    currentStreak: 3,
                    longestStreak: 3,
                    lastStudyDate: null,
                    unlockedAchievementIds: [],
                    unlockedAtById: {},
                    studiedStudysetUUIDs: [],
                    studysetSessionCounts: {},
                },
                customAchievements: [],
                notifications: DEFAULT_NOTIFICATION_PREFERENCES,
            },
        };
        await claimLocalData('user-1');
        await userRepository.create(user);
        const updateUserMetadata = vi.fn().mockResolvedValue({});
        const engine = new SyncEngine({
            apiClient: apiClientWith(updateUserMetadata),
        });

        await engine.forceSync();

        expect(updateUserMetadata).toHaveBeenCalledExactlyOnceWith(editable);
        expect(await userRepository.getPendingChanges()).toEqual([]);
    });

    it('does not push before local data is claimed', async () => {
        await userRepository.create({
            ...DEFAULT_USER_DATA,
            userUUID: 'user-1',
        });
        const updateUserMetadata = vi.fn().mockResolvedValue({});
        const engine = new SyncEngine({
            apiClient: apiClientWith(updateUserMetadata),
        });

        await engine.forceSync();

        expect(updateUserMetadata).not.toHaveBeenCalled();
    });

    describe('queued deletes', () => {
        it('deletes a synced set once and leaves nothing pending (#296)', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a')]);
            await studysetRepository.delete('a' as UUID);
            const api = fakeApi();
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();

            expect(api.deleteStudyset).toHaveBeenCalledExactlyOnceWith('a');
            expect(api.updateStudyset).not.toHaveBeenCalled();
            expect(await pendingIds()).toEqual([]);
            expect(await studysetRepository.getById('a' as UUID)).toBeUndefined();
            expect(await getDatabase().syncQueue.count()).toBe(0);
            expect(engine.getState().status).toBe('idle');
        });

        it('settles every set a bulk delete queued (#296)', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a'), set('b')]);
            await studysetRepository.bulkDelete(['a', 'b'] as UUID[]);
            const api = fakeApi();
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();

            expect(api.deleteStudyset).toHaveBeenCalledTimes(2);
            expect(api.updateStudyset).not.toHaveBeenCalled();
            expect(await studysetRepository.getAll()).toEqual([]);
            expect(await getDatabase().syncQueue.count()).toBe(0);
        });

        it('treats a 404 on a queued delete as already deleted', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a')]);
            await studysetRepository.delete('a' as UUID);
            const api = fakeApi();
            api.deleteStudyset.mockRejectedValue(new HttpError(404, 'gone'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();

            expect(await studysetRepository.getById('a' as UUID)).toBeUndefined();
            expect(await getDatabase().syncQueue.count()).toBe(0);
            expect(engine.getState().status).toBe('idle');
        });
    });
});
