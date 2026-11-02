import { useLogto } from '@logto/react';
import { useEffect, useRef } from 'react';
import { useGetUser } from 'state/api/usersAPI';
import { useGamificationStore } from 'state/stores/gamification';
import { claimLocalData } from 'state/local/localData';

/**
 * Claims the device's local data for the signed-in user, then pulls gamification
 * from the server and retries pending pushes.
 */
export function GamificationSyncInitializer() {
    const { isAuthenticated: authenticated } = useLogto();
    const syncedRef = useRef(false);

    const { data: userResponse } = useGetUser({
        enabled: authenticated,
    });

    useEffect(() => {
        if (!authenticated || !userResponse?.user || syncedRef.current) return;
        syncedRef.current = true;

        const user = userResponse.user;
        void (async () => {
            try {
                await claimLocalData(user.userUUID);
                // Another initializer may have loaded the previous owner's
                // state into memory before the claim wiped it.
                await useGamificationStore.getState().hydrateFromDb();
                await useGamificationStore.getState().syncFromServer(user);
            } catch (error) {
                console.error(
                    'Failed to prepare local data for this user:',
                    error
                );
            }
        })();
    }, [authenticated, userResponse?.user]);

    useEffect(() => {
        if (!authenticated) {
            syncedRef.current = false;
        }
    }, [authenticated]);

    useEffect(() => {
        const retryPending = () => {
            if (!authenticated) return;
            void useGamificationStore.getState().retryPendingSync();
        };

        window.addEventListener('online', retryPending);
        return () => window.removeEventListener('online', retryPending);
    }, [authenticated]);

    return null;
}
