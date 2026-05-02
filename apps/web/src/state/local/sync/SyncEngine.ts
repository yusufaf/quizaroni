import { getDatabase, hasPendingSync, type LocalStudyset } from '../db';
import { studysetRepository, userRepository } from '../repositories';
import type { Studyset, UUID } from 'shared/types';

// Sync status events for UI feedback
type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
    status: SyncStatus;
    lastSyncAt: number | null;
    pendingCount: number;
    error: string | null;
}

type SyncListener = (state: SyncState) => void;

// Options for configuring sync behavior
export interface SyncOptions {
    // API client for backend communication
    apiClient: {
        updateStudyset: (
            studysetUUID: UUID,
            updates: Record<string, unknown>
        ) => Promise<unknown>;
        createStudyset: (studyset: Studyset) => Promise<unknown>;
        deleteStudyset: (studysetUUID: UUID) => Promise<unknown>;
        updateUserMetadata: (
            updates: Record<string, unknown>
        ) => Promise<unknown>;
        // Bulk operations
        bulkUpdateStudysets?: (
            updates: [UUID, Record<string, unknown>][]
        ) => Promise<unknown>;
    } | null;
    // Polling interval in ms (default: 30000 = 30s)
    pollInterval: number;
    // Retry attempts for failed operations (default: 3)
    maxRetries: number;
    // Whether sync is enabled
    enabled: boolean;
}

const DEFAULT_OPTIONS: SyncOptions = {
    apiClient: null,
    pollInterval: 30000,
    maxRetries: 3,
    enabled: true,
};

export class SyncEngine {
    private options: SyncOptions;
    private listeners: Set<SyncListener> = new Set();
    private state: SyncState = {
        status: 'idle',
        lastSyncAt: null,
        pendingCount: 0,
        error: null,
    };
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private isOnline: boolean = navigator.onLine;

    constructor(options: Partial<SyncOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.setupNetworkListeners();
        this.updatePendingCount();
    }

    // ========== Public API ==========

    subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        // Immediately notify with current state
        listener(this.state);

        return () => {
            this.listeners.delete(listener);
        };
    }

    start(): void {
        if (this.pollTimer) return;

        this.pollTimer = setInterval(() => {
            this.sync();
        }, this.options.pollInterval);

        // Initial sync
        this.sync();
    }

    stop(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    async sync(): Promise<void> {
        // Skip if disabled, offline, or already syncing
        if (
            !this.options.enabled ||
            !this.isOnline ||
            this.state.status === 'syncing'
        ) {
            return;
        }

        // Skip if no API client configured (pure local mode)
        if (!this.options.apiClient) {
            this.setState({ status: 'idle' });
            return;
        }

        const hasPending = await hasPendingSync();
        if (!hasPending) {
            this.setState({ status: 'idle', pendingCount: 0 });
            return;
        }

        this.setState({ status: 'syncing' });

        try {
            await this.processSyncQueue();
            await this.syncPendingStudysets();
            await this.syncPendingUsers();

            this.setState({
                status: 'idle',
                lastSyncAt: Date.now(),
                pendingCount: 0,
                error: null,
            });
        } catch (error) {
            this.setState({
                status: 'error',
                error: error instanceof Error ? error.message : 'Sync failed',
            });
        }
    }

    async forceSync(): Promise<void> {
        return this.sync();
    }

    getState(): SyncState {
        return { ...this.state };
    }

    setOptions(newOptions: Partial<SyncOptions>): void {
        const wasRunning = this.pollTimer !== null;

        this.options = { ...this.options, ...newOptions };

        // Restart if poll interval changed
        if (wasRunning) {
            this.stop();
            this.start();
        }
    }

    // ========== Private Methods ==========

    private setState(updates: Partial<SyncState>): void {
        this.state = { ...this.state, ...updates };
        this.listeners.forEach((listener) => listener(this.state));
    }

    private async updatePendingCount(): Promise<void> {
        const db = getDatabase();
        const [studysets, users, queue] = await Promise.all([
            db.studysets.where('_syncStatus').equals('pending').count(),
            db.users.where('_syncStatus').equals('pending').count(),
            db.syncQueue.count(),
        ]);
        this.setState({ pendingCount: studysets + users + queue });
    }

    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.setState({ status: 'idle' });
            this.sync(); // Trigger immediate sync
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.setState({ status: 'offline' });
        });
    }

    // Process the sync queue (delete operations, etc.)
    private async processSyncQueue(): Promise<void> {
        const db = getDatabase();
        const queue = await db.syncQueue.orderBy('createdAt').toArray();

        for (const item of queue) {
            if (!this.options.apiClient) continue;

            try {
                switch (item.entityType) {
                    case 'studyset': {
                        if (item.operation === 'delete') {
                            await this.options.apiClient.deleteStudyset(
                                item.entityId
                            );
                        }
                        break;
                    }
                }

                // Remove from queue on success
                await db.syncQueue.delete(item.id);
            } catch (error) {
                // Increment retry count
                if (item.retryCount >= this.options.maxRetries) {
                    // Give up and remove from queue
                    await db.syncQueue.delete(item.id);
                    console.error(
                        `Failed to sync after ${this.options.maxRetries} retries:`,
                        item
                    );
                } else {
                    await db.syncQueue.update(item.id, {
                        retryCount: item.retryCount + 1,
                    });
                }
                throw error; // Propagate to stop sync
            }
        }
    }

    // Sync pending studyset changes
    private async syncPendingStudysets(): Promise<void> {
        const pending = await studysetRepository.getPendingChanges();
        if (pending.length === 0) return;
        if (!this.options.apiClient) return;

        // Separate creates from updates
        const creates: LocalStudyset[] = [];
        const updates: LocalStudyset[] = [];

        for (const studyset of pending) {
            if (studyset._localOnly) {
                creates.push(studyset);
            } else {
                updates.push(studyset);
            }
        }

        // Process creates
        for (const studyset of creates) {
            try {
                const {
                    _syncStatus,
                    _lastModified,
                    _localOnly,
                    ...cleanStudyset
                } = studyset;
                await this.options.apiClient.createStudyset(
                    cleanStudyset as Studyset
                );
                await studysetRepository.markAsSynced(studyset.studysetUUID);
            } catch (error) {
                console.error(
                    'Failed to create studyset:',
                    studyset.studysetUUID,
                    error
                );
                throw error;
            }
        }

        // Process updates (bulk if available)
        if (this.options.apiClient.bulkUpdateStudysets && updates.length > 1) {
            try {
                const bulkUpdates = updates.map((s) => {
                    const {
                        _syncStatus,
                        _lastModified,
                        _localOnly,
                        ...cleanStudyset
                    } = s;
                    return [s.studysetUUID, cleanStudyset] as [
                        UUID,
                        Record<string, unknown>,
                    ];
                });
                await this.options.apiClient.bulkUpdateStudysets(bulkUpdates);

                for (const studyset of updates) {
                    await studysetRepository.markAsSynced(
                        studyset.studysetUUID
                    );
                }
            } catch (error) {
                console.error(
                    'Bulk update failed, falling back to individual updates:',
                    error
                );
                // Fall through to individual updates
            }
        }

        // Individual updates (fallback or if no bulk endpoint)
        for (const studyset of updates) {
            try {
                const {
                    _syncStatus,
                    _lastModified,
                    _localOnly,
                    ...cleanUpdates
                } = studyset;
                await this.options.apiClient.updateStudyset(
                    studyset.studysetUUID,
                    cleanUpdates
                );
                await studysetRepository.markAsSynced(studyset.studysetUUID);
            } catch (error) {
                console.error(
                    'Failed to update studyset:',
                    studyset.studysetUUID,
                    error
                );
                throw error;
            }
        }
    }

    // Sync pending user changes
    private async syncPendingUsers(): Promise<void> {
        const pending = await userRepository.getPendingChanges();
        if (pending.length === 0) return;
        if (!this.options.apiClient) return;

        for (const user of pending) {
            try {
                const metadataUpdates = { ...user.metadata };
                await this.options.apiClient.updateUserMetadata(
                    metadataUpdates
                );
                await userRepository.markAsSynced(user.userUUID);
            } catch (error) {
                console.error('Failed to update user:', user.userUUID, error);
                throw error;
            }
        }
    }
}

// Singleton instance
let syncEngineInstance: SyncEngine | null = null;

export function getSyncEngine(options?: Partial<SyncOptions>): SyncEngine {
    if (!syncEngineInstance) {
        syncEngineInstance = new SyncEngine(options);
    } else if (options) {
        syncEngineInstance.setOptions(options);
    }
    return syncEngineInstance;
}

export function resetSyncEngine(): void {
    if (syncEngineInstance) {
        syncEngineInstance.stop();
        syncEngineInstance = null;
    }
}
