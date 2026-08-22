import { useLogto } from '@logto/react';
import { useEffect, useRef } from 'react';
import { useGetUser } from 'state/api/usersAPI';
import { useGamificationStore } from 'state/stores/gamification';

/**
 * Pulls gamification from the server when authenticated and retries pending pushes.
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

        void useGamificationStore.getState().syncFromServer(userResponse.user);
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
