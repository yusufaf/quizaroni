import { useCallback } from 'react';
import { useLogto } from '@logto/react';
import { useGlobalStore } from 'state/stores/global';

/**
 * Removes this account's local data from the device, then signs out of Logto
 * and clears the (vestigial) global-store auth mirror. Local data is loaded on
 * demand so Dexie stays out of the NavBar chunk.
 */
export const useSignOut = () => {
    const { signOut } = useLogto();
    const setAuthenticated = useGlobalStore((state) => state.setAuthenticated);

    return useCallback(async () => {
        try {
            const { clearLocalData } = await import('state/local/localData');
            await clearLocalData();
        } catch (error) {
            // Sign out anyway: the stored owner marker makes the next account
            // that signs in here wipe whatever is left.
            console.error('Error clearing local data:', error);
        }

        try {
            await signOut(window.location.origin);
            setAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }, [setAuthenticated, signOut]);
};

/**
 * Signs out, unless progress meant for the server hasn't reached it yet — then
 * opens the logout confirmation instead. Shared by the desktop nav and the
 * mobile drawer.
 */
export const useLogout = () => {
    const signOutNow = useSignOut();

    return useCallback(async () => {
        let unsynced = false;
        try {
            const { hasUnsyncedLocalChanges } = await import(
                'state/local/localData'
            );
            unsynced = await hasUnsyncedLocalChanges();
        } catch (error) {
            console.error('Error checking for unsynced progress:', error);
        }

        if (unsynced) {
            useGlobalStore.getState().setLogoutConfirmOpen(true);
            return;
        }

        await signOutNow();
    }, [signOutNow]);
};
