// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { useGlobalStore } from 'state/stores/global';
import {
    claimLocalData,
    clearLocalData,
    hasUnsyncedLocalChanges,
} from 'state/local/localData';
import { setClaimedOwner } from 'state/local/owner';
import { useLogout } from './useLogout';

const signOut = vi.fn<(redirectUri?: string) => Promise<void>>();

vi.mock('@logto/react', () => ({
    useLogto: () => ({ signOut }),
}));

vi.mock('state/local/localData', () => ({
    claimLocalData: vi.fn(),
    clearLocalData: vi.fn(),
    hasUnsyncedLocalChanges: vi.fn(),
}));

const logout = () => renderHook(() => useLogout()).result.current();

describe('useLogout', () => {
    afterEach(() => {
        vi.mocked(claimLocalData).mockReset();
        vi.mocked(clearLocalData).mockReset();
        setClaimedOwner(null);
        vi.mocked(hasUnsyncedLocalChanges).mockReset();
        signOut.mockReset();
        useGlobalStore.setState({ logoutConfirmOpen: false });
    });

    it('clears local data before signing out', async () => {
        vi.mocked(hasUnsyncedLocalChanges).mockResolvedValue(false);
        vi.mocked(clearLocalData).mockResolvedValue(undefined);

        await logout();

        expect(clearLocalData).toHaveBeenCalledOnce();
        expect(signOut).toHaveBeenCalledExactlyOnceWith(window.location.origin);
        expect(
            vi.mocked(clearLocalData).mock.invocationCallOrder[0]!
        ).toBeLessThan(signOut.mock.invocationCallOrder[0]!);
    });

    it('still signs out when clearing local data fails', async () => {
        vi.mocked(hasUnsyncedLocalChanges).mockResolvedValue(false);
        vi.mocked(clearLocalData).mockRejectedValue(new Error('idb broken'));
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        await logout();

        expect(signOut).toHaveBeenCalledOnce();
        consoleError.mockRestore();
    });

    it('asks for confirmation instead of signing out when progress is unsynced', async () => {
        vi.mocked(hasUnsyncedLocalChanges).mockResolvedValue(true);

        await logout();

        expect(signOut).not.toHaveBeenCalled();
        expect(clearLocalData).not.toHaveBeenCalled();
        expect(useGlobalStore.getState().logoutConfirmOpen).toBe(true);
    });

    it('asks for confirmation when the unsynced check fails', async () => {
        vi.mocked(hasUnsyncedLocalChanges).mockRejectedValue(new Error('boom'));
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        await logout();

        expect(signOut).not.toHaveBeenCalled();
        expect(clearLocalData).not.toHaveBeenCalled();
        expect(useGlobalStore.getState().logoutConfirmOpen).toBe(true);
        consoleError.mockRestore();
    });

    it('claims local data again when signing out fails', async () => {
        setClaimedOwner('user-A');
        vi.mocked(hasUnsyncedLocalChanges).mockResolvedValue(false);
        vi.mocked(clearLocalData).mockImplementation(async () => {
            setClaimedOwner(null);
        });
        signOut.mockRejectedValue(new Error('offline'));
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        await logout();

        expect(claimLocalData).toHaveBeenCalledExactlyOnceWith('user-A');
        consoleError.mockRestore();
    });

    it('ignores a second click while signing out is in progress', async () => {
        let finishCheck!: (unsynced: boolean) => void;
        vi.mocked(hasUnsyncedLocalChanges).mockReturnValue(
            new Promise((resolve) => {
                finishCheck = resolve;
            })
        );
        vi.mocked(clearLocalData).mockResolvedValue(undefined);
        const handleLogout = renderHook(() => useLogout()).result.current;

        const first = handleLogout();
        const second = handleLogout();
        finishCheck(false);
        await Promise.all([first, second]);

        expect(hasUnsyncedLocalChanges).toHaveBeenCalledOnce();
        expect(signOut).toHaveBeenCalledOnce();
    });
});
