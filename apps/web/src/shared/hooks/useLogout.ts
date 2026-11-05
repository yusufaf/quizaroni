import { useCallback } from 'react';
import { useAuth } from 'shared/auth/useAuth';
import { reloadPage } from 'state/local/owner';
import { useGlobalStore } from 'state/stores/global';

// Module-level so a double click on any sign-out control (nav, drawer, the
// confirm dialog) runs one sign-out.
let signOutInProgress = false;

/**
 * Removes this account's local data from the device, then signs out and
 * clears the (vestigial) global-store auth mirror. Local data is loaded on
 * demand so Dexie stays out of the NavBar chunk.
 */
export const useSignOut = () => {
    const { signOut } = useAuth();
    const setAuthenticated = useGlobalStore((state) => state.setAuthenticated);

    return useCallback(async () => {
        if (signOutInProgress) return;
        signOutInProgress = true;

        try {
            try {
                const { clearLocalData } =
                    await import('state/local/localData');
                await clearLocalData();
            } catch (error) {
                // Sign out anyway: the stored owner marker makes the next
                // account that signs in here wipe whatever is left.
                console.error('Error clearing local data:', error);
            }

            try {
                await signOut();
            } catch (error) {
                console.error('Error signing out:', error);
                // Still signed in with the local data already cleared. A
                // reload claims it again and pulls progress back from the
                // server, instead of leaving pushes blocked and the UI empty.
                reloadPage();
                return;
            }

            setAuthenticated(false);
        } finally {
            signOutInProgress = false;
        }
    }, [setAuthenticated, signOut]);
};

// Shared by every useLogout caller (desktop nav, mobile drawer), so a second
// click during the unsynced check doesn't start a second sign-out.
let logoutInProgress = false;

/**
 * Signs out, unless progress meant for the server hasn't reached it yet — then
 * opens the logout confirmation instead. Shared by the desktop nav and the
 * mobile drawer.
 */
export const useLogout = () => {
    const signOutNow = useSignOut();

    return useCallback(async () => {
        if (logoutInProgress) return;
        logoutInProgress = true;

        try {
            let unsynced: boolean;
            try {
                const { hasUnsyncedLocalChanges } =
                    await import('state/local/localData');
                unsynced = await hasUnsyncedLocalChanges();
            } catch (error) {
                // Can't tell, so let the user decide rather than wipe silently.
                console.error('Error checking for unsynced progress:', error);
                unsynced = true;
            }

            if (unsynced) {
                useGlobalStore.getState().setLogoutConfirmOpen(true);
                return;
            }

            await signOutNow();
        } finally {
            logoutInProgress = false;
        }
    }, [signOutNow]);
};
