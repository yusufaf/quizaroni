import { pickClientEditableUserMetadata } from '@quizaroni/shared-types';
import {
    getDatabase,
    hasPendingSync,
    stripLocalMetadata,
    type LocalStudyset,
} from '../db';
import { isClaimCurrent } from '../owner';
import { studysetRepository, userRepository } from '../repositories';
import type { Studyset, UUID } from 'shared/types';
import { isHttpStatus, isRetryableSyncError } from 'state/api/apiClient';

export { isRetryableSyncError } from 'state/api/apiClient';

// Sync status events for UI feedback
type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
    status: SyncStatus;
    lastSyncAt: number | null;
    pendingCount: number;
    // Study sets the server kept rejecting; they wait for a local edit.
    failedCount: number;
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
        failedCount: 0,
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

        // Never push data this page load hasn't claimed for the signed-in user
        if (!isClaimCurrent()) {
            return;
        }

        // Skip if no API client configured (pure local mode)
        if (!this.options.apiClient) {
            this.setState({ status: 'idle' });
            return;
        }

        const hasPending = await hasPendingSync();
        if (!hasPending) {
            // Keeps failedCount current between passes.
            await this.updatePendingCount();
            this.setState({ status: 'idle' });
            return;
        }

        this.setState({ status: 'syncing' });

        // Each phase records its failures and carries on, so one bad item
        // doesn't hold back the rest of the pass (#303).
        const errors: unknown[] = [];
        const phases = [
            () => this.processSyncQueue(errors),
            () => this.syncPendingStudysets(errors),
            () => this.syncPendingUsers(errors),
            () => this.updatePendingCount(),
        ];
        for (const phase of phases) {
            try {
                await phase();
            } catch (error) {
                errors.push(error);
            }
        }

        if (errors.length === 0) {
            this.setState({
                status: 'idle',
                lastSyncAt: Date.now(),
                error: null,
            });
        } else {
            const [first] = errors;
            this.setState({
                status: 'error',
                error: first instanceof Error ? first.message : 'Sync failed',
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
        const [studysets, users, queue, failed] = await Promise.all([
            db.studysets.where('_syncStatus').equals('pending').count(),
            db.users.where('_syncStatus').equals('pending').count(),
            db.syncQueue.count(),
            db.studysets.where('_syncStatus').equals('failed').count(),
        ]);
        this.setState({
            pendingCount: studysets + users + queue,
            failedCount: failed,
        });
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
    private async processSyncQueue(errors: unknown[]): Promise<void> {
        const db = getDatabase();
        const queue = await db.syncQueue.orderBy('createdAt').toArray();

        for (const item of queue) {
            if (!this.options.apiClient) continue;

            try {
                const isStudysetDelete =
                    item.entityType === 'studyset' &&
                    item.operation === 'delete';
                if (isStudysetDelete) {
                    try {
                        await this.options.apiClient.deleteStudyset(
                            item.entityId
                        );
                    } catch (error) {
                        // Already gone on the server: the delete is done.
                        if (!isHttpStatus(error, 404)) throw error;
                    }
                }

                // The local row stays pending until its delete succeeds
                // (#296); drop it with the queue item so it isn't then sent
                // as an update.
                await db.transaction(
                    'rw',
                    db.syncQueue,
                    db.studysets,
                    async () => {
                        await db.syncQueue.delete(item.id);
                        if (isStudysetDelete) {
                            await db.studysets.delete(item.entityId);
                        }
                    }
                );
            } catch (error) {
                errors.push(error);
                // Transient failures (offline, 5xx, auth) don't use up retries.
                if (!isRetryableSyncError(error)) {
                    if (item.retryCount >= this.options.maxRetries) {
                        // Give up and remove from queue. A set whose delete
                        // the server refused becomes 'failed' rather than
                        // staying pending, which would send it as an update.
                        await db.transaction(
                            'rw',
                            db.syncQueue,
                            db.studysets,
                            async () => {
                                await db.syncQueue.delete(item.id);
                                if (
                                    item.entityType === 'studyset' &&
                                    item.operation === 'delete'
                                ) {
                                    await db.studysets.update(item.entityId, {
                                        _syncStatus: 'failed',
                                    });
                                }
                            }
                        );
                        console.error(
                            `Failed to sync after ${this.options.maxRetries} retries:`,
                            item
                        );
                    } else {
                        await db.syncQueue.update(item.id, {
                            retryCount: item.retryCount + 1,
                        });
                    }
                }
            }
        }
    }

    // Sync pending studyset changes
    private async syncPendingStudysets(errors: unknown[]): Promise<void> {
        const pending = await studysetRepository.getPendingChanges();
        if (pending.length === 0) return;
        if (!this.options.apiClient) return;

        // A set whose delete is still queued must not be sent as an update.
        const queuedDeletes = new Set(
            (
                await getDatabase()
                    .syncQueue.where('entityType')
                    .equals('studyset')
                    .toArray()
            )
                .filter((item) => item.operation === 'delete')
                .map((item) => item.entityId)
        );

        // Separate creates from updates
        const creates: LocalStudyset[] = [];
        const updates: LocalStudyset[] = [];

        for (const studyset of pending) {
            if (queuedDeletes.has(studyset.studysetUUID)) continue;
            if (studyset._localOnly) {
                creates.push(studyset);
            } else {
                updates.push(studyset);
            }
        }

        // Process creates
        for (const studyset of creates) {
            try {
                await this.options.apiClient.createStudyset(
                    stripLocalMetadata(studyset)
                );
                await studysetRepository.markAsSynced(studyset.studysetUUID);
            } catch (error) {
                console.error(
                    'Failed to create studyset:',
                    studyset.studysetUUID,
                    error
                );
                await this.recordStudysetFailure(studyset, error, errors);
            }
        }

        // Process updates
        for (const studyset of updates) {
            try {
                await this.options.apiClient.updateStudyset(
                    studyset.studysetUUID,
                    stripLocalMetadata(studyset)
                );
                await studysetRepository.markAsSynced(studyset.studysetUUID);
            } catch (error) {
                console.error(
                    'Failed to update studyset:',
                    studyset.studysetUUID,
                    error
                );
                await this.recordStudysetFailure(studyset, error, errors);
            }
        }
    }

    private async recordStudysetFailure(
        studyset: LocalStudyset,
        error: unknown,
        errors: unknown[]
    ): Promise<void> {
        errors.push(error);
        if (!isRetryableSyncError(error)) {
            await studysetRepository.recordRejection(
                studyset.studysetUUID,
                this.options.maxRetries
            );
        }
    }

    // Sync pending user changes
    private async syncPendingUsers(errors: unknown[]): Promise<void> {
        const pending = await userRepository.getPendingChanges();
        if (pending.length === 0) return;
        if (!this.options.apiClient) return;

        for (const user of pending) {
            try {
                // A stale local copy of the server-managed keys would revert
                // values the dedicated endpoints wrote since (#207).
                const metadataUpdates = pickClientEditableUserMetadata(
                    user.metadata
                );
                await this.options.apiClient.updateUserMetadata(
                    metadataUpdates
                );
                await userRepository.markAsSynced(user.userUUID);
            } catch (error) {
                console.error('Failed to update user:', user.userUUID, error);
                errors.push(error);
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
