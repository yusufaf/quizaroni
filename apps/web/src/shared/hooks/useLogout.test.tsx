// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { useGlobalStore } from 'state/stores/global';
import { clearLocalData, hasUnsyncedLocalChanges } from 'state/local/localData';
import { useLogout } from './useLogout';

const signOut = vi.fn<(redirectUri?: string) => Promise<void>>();

vi.mock('@logto/react', () => ({
    useLogto: () => ({ signOut }),
}));

vi.mock('state/local/localData', () => ({
    clearLocalData: vi.fn(),
    hasUnsyncedLocalChanges: vi.fn(),
}));

const logout = () => renderHook(() => useLogout()).result.current();

describe('useLogout', () => {
    afterEach(() => {
        vi.mocked(clearLocalData).mockReset();
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

    it('signs out when the unsynced check fails', async () => {
        vi.mocked(hasUnsyncedLocalChanges).mockRejectedValue(new Error('boom'));
        vi.mocked(clearLocalData).mockResolvedValue(undefined);
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        await logout();

        expect(signOut).toHaveBeenCalledOnce();
        expect(useGlobalStore.getState().logoutConfirmOpen).toBe(false);
        consoleError.mockRestore();
    });
});
