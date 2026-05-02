import { useEffect, useState, useCallback } from 'react';
import { getSyncEngine, type SyncOptions } from '../sync/SyncEngine';

interface UseSyncReturn {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: number | null;
    pendingCount: number;
    error: string | null;
    triggerSync: () => Promise<void>;
}

export function useSync(options?: Partial<SyncOptions>): UseSyncReturn {
    const [state, setState] = useState({
        isOnline: navigator.onLine,
        isSyncing: false,
        lastSyncAt: null as number | null,
        pendingCount: 0,
        error: null as string | null,
    });

    const syncEngine = getSyncEngine(options);

    useEffect(() => {
        const unsubscribe = syncEngine.subscribe((syncState) => {
            setState({
                isOnline: syncState.status !== 'offline',
                isSyncing: syncState.status === 'syncing',
                lastSyncAt: syncState.lastSyncAt,
                pendingCount: syncState.pendingCount,
                error: syncState.error,
            });
        });

        return unsubscribe;
    }, [syncEngine]);

    // Listen to network status
    useEffect(() => {
        const handleOnline = () => {
            setState((prev) => ({ ...prev, isOnline: true }));
        };
        const handleOffline = () => {
            setState((prev) => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const triggerSync = useCallback(async () => {
        await syncEngine.forceSync();
    }, [syncEngine]);

    return {
        ...state,
        triggerSync,
    };
}
