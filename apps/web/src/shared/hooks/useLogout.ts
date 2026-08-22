import { useCallback } from 'react';
import { useLogto } from '@logto/react';
import { useGlobalStore } from 'state/stores/global';

/**
 * Signs the user out of Logto and clears the (vestigial) global-store auth
 * mirror. Shared by the desktop nav and the mobile drawer.
 */
export const useLogout = () => {
    const { signOut } = useLogto();
    const setAuthenticated = useGlobalStore((state) => state.setAuthenticated);

    return useCallback(async () => {
        try {
            await signOut(window.location.origin);
            setAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }, [setAuthenticated, signOut]);
};
