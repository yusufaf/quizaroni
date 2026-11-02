// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    DEFAULT_USER_DATA,
} from 'shared/constants';
import type { User } from 'shared/types';
import { claimLocalData, clearLocalData } from '../localData';
import { setClaimedOwner } from '../owner';
import { userRepository } from '../repositories';
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
        await userRepository.create({ ...DEFAULT_USER_DATA, userUUID: 'user-1' });
        const updateUserMetadata = vi.fn().mockResolvedValue({});
        const engine = new SyncEngine({
            apiClient: apiClientWith(updateUserMetadata),
        });

        await engine.forceSync();

        expect(updateUserMetadata).not.toHaveBeenCalled();
    });
});
