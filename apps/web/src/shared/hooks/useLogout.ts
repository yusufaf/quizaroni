import { useCallback } from 'react';
import { signOut } from 'aws-amplify/auth';
import { useGlobalStore } from 'state/stores/global';

/**
 * Signs the user out of Amplify and clears the (vestigial) global-store auth
 * mirror. Shared by the desktop nav and the mobile drawer.
 */
export const useLogout = () => {
    const setAuthenticated = useGlobalStore((state) => state.setAuthenticated);

    return useCallback(async () => {
        try {
            await signOut();
            setAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }, [setAuthenticated]);
};
