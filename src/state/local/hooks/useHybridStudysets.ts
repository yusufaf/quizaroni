import {
    useQuery,
    useMutation,
    useQueryClient,
    useMutationState,
} from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { studysetRepository } from '../repositories';
import { getSyncEngine } from '../sync/SyncEngine';
import type {
    Studyset,
    UUID,
    GetAllStudysetsResponse,
    GetStudysetResponse,
} from 'shared/types';
import type { LocalStudyset } from '../db';

// Configuration for hybrid mode
const HYBRID_MODE = {
    // If true, always read from local DB, sync to backend in background
    // If false, use traditional API-first approach
    LOCAL_FIRST: true,
    // If true, sync changes to backend
    // If false, operate fully offline
    SYNC_ENABLED: true,
};

// ============== READ OPERATIONS ==============

/**
 * Hybrid hook that fetches studysets from local DB first,
 * then refreshes from server when online
 */
export function useHybridGetAllStudysets(enabled: boolean = true) {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    const query = useQuery({
        queryKey: ['studysets', 'hybrid', 'all'],
        queryFn: async (): Promise<GetAllStudysetsResponse> => {
            // Always read from local DB first
            const localStudysets = await studysetRepository.getAll();

            // If local is empty and we're online, wait for server sync
            if (
                localStudysets.length === 0 &&
                navigator.onLine &&
                HYBRID_MODE.SYNC_ENABLED
            ) {
                // Return empty initially, background sync will populate
                return { studysets: [] };
            }

            // Strip local metadata before returning
            const cleanStudysets = localStudysets.map(stripLocalMetadata);
            return { studysets: cleanStudysets };
        },
        initialData: { studysets: [] },
        enabled,
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
    });

    // Subscribe to sync events to refetch when data changes
    useEffect(() => {
        const unsubscribe = syncEngine.subscribe((state) => {
            if (state.status === 'idle' && state.lastSyncAt) {
                // Trigger refetch when sync completes
                queryClient.invalidateQueries({
                    queryKey: ['studysets', 'hybrid', 'all'],
                });
            }
        });

        return unsubscribe;
    }, [queryClient, syncEngine]);

    return query;
}

export function useHybridGetStudyset(studysetUUID: UUID | undefined) {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    const query = useQuery({
        queryKey: ['studysets', 'hybrid', studysetUUID],
        queryFn: async (): Promise<GetStudysetResponse | null> => {
            if (!studysetUUID) return null;

            const localStudyset =
                await studysetRepository.getById(studysetUUID);
            if (!localStudyset) return null;

            return { studyset: stripLocalMetadata(localStudyset) };
        },
        enabled: !!studysetUUID,
        staleTime: 60 * 1000, // 1 minute
    });

    // Refetch when sync completes
    useEffect(() => {
        if (!studysetUUID) return;

        const unsubscribe = syncEngine.subscribe((state) => {
            if (state.status === 'idle' && state.lastSyncAt) {
                queryClient.invalidateQueries({
                    queryKey: ['studysets', 'hybrid', studysetUUID],
                });
            }
        });

        return unsubscribe;
    }, [queryClient, syncEngine, studysetUUID]);

    return query;
}

// ============== WRITE OPERATIONS ==============

/**
 * Create studyset locally, queue for sync if enabled
 */
export function useHybridCreateStudyset() {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    return useMutation({
        mutationKey: ['hybrid', 'create-studyset'],
        mutationFn: async (studyset: Studyset): Promise<Studyset> => {
            // Always save to local DB first
            const localStudyset = await studysetRepository.create(studyset);

            // Trigger sync if enabled
            if (HYBRID_MODE.SYNC_ENABLED && navigator.onLine) {
                syncEngine.forceSync();
            }

            return stripLocalMetadata(localStudyset);
        },
        onSuccess: () => {
            // Invalidate the list query
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid', 'all'],
            });
        },
    });
}

/**
 * Update studyset locally, queue for sync
 */
export function useHybridUpdateStudyset() {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    return useMutation({
        mutationKey: ['hybrid', 'update-studyset'],
        mutationFn: async ({
            studysetUUID,
            updates,
        }: {
            studysetUUID: UUID;
            updates: Partial<Studyset>;
        }): Promise<Studyset | null> => {
            const updated = await studysetRepository.update(
                studysetUUID,
                updates
            );

            if (HYBRID_MODE.SYNC_ENABLED && navigator.onLine) {
                syncEngine.forceSync();
            }

            return updated ? stripLocalMetadata(updated) : null;
        },
        onSuccess: (_, variables) => {
            // Invalidate both list and detail queries
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid', 'all'],
            });
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid', variables.studysetUUID],
            });
        },
    });
}

/**
 * Delete studyset locally, queue for sync
 */
export function useHybridDeleteStudyset() {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    return useMutation({
        mutationKey: ['hybrid', 'delete-studyset'],
        mutationFn: async (studysetUUID: UUID): Promise<boolean> => {
            const result = await studysetRepository.delete(studysetUUID);

            if (HYBRID_MODE.SYNC_ENABLED && navigator.onLine) {
                syncEngine.forceSync();
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid'],
            });
        },
    });
}

/**
 * Bulk delete studysets
 */
export function useHybridBatchDeleteStudysets() {
    const queryClient = useQueryClient();
    const syncEngine = getSyncEngine();

    return useMutation({
        mutationKey: ['hybrid', 'batch-delete-studysets'],
        mutationFn: async (studysetUUIDs: UUID[]): Promise<void> => {
            await studysetRepository.bulkDelete(studysetUUIDs);

            if (HYBRID_MODE.SYNC_ENABLED && navigator.onLine) {
                syncEngine.forceSync();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid'],
            });
        },
    });
}

/**
 * Duplicate studyset locally
 */
export function useHybridDuplicateStudyset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['hybrid', 'duplicate-studyset'],
        mutationFn: async ({
            sourceStudyset,
            newUUID,
        }: {
            sourceStudyset: Studyset;
            newUUID: UUID;
        }): Promise<Studyset> => {
            const now = new Date().toISOString();
            const duplicated: Studyset = {
                ...sourceStudyset,
                studysetUUID: newUUID,
                uuid: newUUID, // Some systems use both
                title: `${sourceStudyset.title} (Copy)`,
                createdAt: now,
                lastViewed: now,
                favorited: false,
            };

            const localStudyset = await studysetRepository.create(duplicated);
            return stripLocalMetadata(localStudyset);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid', 'all'],
            });
        },
    });
}

// ============== SYNC OPERATIONS ==============

/**
 * Import studysets from server (initial sync or refresh)
 */
export function useHybridImportFromServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['hybrid', 'import-from-server'],
        mutationFn: async (studysets: Studyset[]): Promise<void> => {
            await studysetRepository.importFromServer(studysets);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['studysets', 'hybrid'],
            });
        },
    });
}

// ============== UTILITIES ==============

function stripLocalMetadata(localStudyset: LocalStudyset): Studyset {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _syncStatus, _lastModified, _localOnly, ...cleanStudyset } =
        localStudyset;
    return cleanStudyset as Studyset;
}

/**
 * Hook to get pending changes count for UI indicators
 */
export function usePendingChangesCount(): number {
    const pendingMutations = useMutationState({
        filters: {
            mutationKey: ['hybrid'],
            status: 'pending',
        },
    });
    return pendingMutations.length;
}

/**
 * Search studysets locally (no API call)
 */
export function useHybridSearchStudysets() {
    return useCallback(async (query: string): Promise<Studyset[]> => {
        const results = await studysetRepository.search(query);
        return results.map(stripLocalMetadata);
    }, []);
}
