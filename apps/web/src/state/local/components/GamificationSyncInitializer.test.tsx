// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { render, waitFor } from '@testing-library/react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type Mock,
    vi,
} from 'vite-plus/test';
import { DEFAULT_USER_DATA } from 'shared/constants';
import type { User } from 'shared/types';
import { useGamificationStore } from 'state/stores/gamification';
import { claimLocalData } from 'state/local/localData';
import { GamificationSyncInitializer } from './GamificationSyncInitializer';

const userB: User = { ...DEFAULT_USER_DATA, userUUID: 'user-B' };

vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: true }),
}));

vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => ({ data: { user: userB } }),
}));

vi.mock('state/local/localData', () => ({
    claimLocalData: vi.fn(),
}));

describe('GamificationSyncInitializer', () => {
    let hydrateFromDb: Mock<() => Promise<void>>;
    let syncFromServer: Mock<(user: User) => Promise<void>>;

    beforeEach(() => {
        hydrateFromDb = vi.fn<() => Promise<void>>().mockResolvedValue(
            undefined
        );
        syncFromServer = vi
            .fn<(user: User) => Promise<void>>()
            .mockResolvedValue(undefined);
        useGamificationStore.setState({ hydrateFromDb, syncFromServer });
    });

    afterEach(() => {
        vi.mocked(claimLocalData).mockReset();
        useGamificationStore.setState(
            useGamificationStore.getInitialState(),
            true
        );
    });

    it('claims local data for the signed-in user before syncing gamification', async () => {
        vi.mocked(claimLocalData).mockResolvedValue(undefined);

        render(<GamificationSyncInitializer />);

        await waitFor(() => expect(syncFromServer).toHaveBeenCalledOnce());
        expect(claimLocalData).toHaveBeenCalledExactlyOnceWith('user-B');
        expect(vi.mocked(claimLocalData).mock.invocationCallOrder[0]!).toBeLessThan(
            syncFromServer.mock.invocationCallOrder[0]!
        );
        expect(syncFromServer).toHaveBeenCalledWith(userB);
    });

    it('does not sync when claiming fails', async () => {
        vi.mocked(claimLocalData).mockRejectedValue(new Error('idb broken'));
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        render(<GamificationSyncInitializer />);

        await waitFor(() => expect(consoleError).toHaveBeenCalled());
        expect(syncFromServer).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
