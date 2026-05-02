import { getDatabase, type LocalStudyset } from '../db';
import type { Studyset, UUID } from 'shared/types';

// Repository for studyset CRUD operations - always hits local Dexie DB
// The sync layer handles pushing changes to backend
export class StudysetRepository {
    private db = getDatabase();

    // ========== Read Operations ==========

    async getAll(): Promise<LocalStudyset[]> {
        return await this.db.studysets.toArray();
    }

    async getById(studysetUUID: UUID): Promise<LocalStudyset | undefined> {
        return await this.db.studysets.get(studysetUUID);
    }

    async getByUser(userUUID: UUID): Promise<LocalStudyset[]> {
        return await this.db.studysets
            .where('userUUID')
            .equals(userUUID)
            .toArray();
    }

    async getByLabel(label: string): Promise<LocalStudyset[]> {
        // Dexie doesn't support array contains directly, filter in memory
        const all = await this.db.studysets.toArray();
        return all.filter((s) => s.labels.includes(label));
    }

    async search(query: string): Promise<LocalStudyset[]> {
        const lowerQuery = query.toLowerCase();
        const all = await this.db.studysets.toArray();
        return all.filter(
            (s) =>
                s.title.toLowerCase().includes(lowerQuery) ||
                s.description.toLowerCase().includes(lowerQuery) ||
                s.labels.some((l) => l.toLowerCase().includes(lowerQuery)) ||
                s.cards.some(
                    (c) =>
                        c.term.toLowerCase().includes(lowerQuery) ||
                        c.definition.toLowerCase().includes(lowerQuery)
                )
        );
    }

    // ========== Write Operations ==========

    async create(studyset: Studyset): Promise<LocalStudyset> {
        const localStudyset: LocalStudyset = {
            ...studyset,
            _syncStatus: 'pending',
            _lastModified: Date.now(),
            _localOnly: true,
        };

        await this.db.studysets.put(localStudyset);
        return localStudyset;
    }

    async update(
        studysetUUID: UUID,
        updates: Partial<Studyset>
    ): Promise<LocalStudyset | undefined> {
        const existing = await this.db.studysets.get(studysetUUID);
        if (!existing) return undefined;

        const updated: LocalStudyset = {
            ...existing,
            ...updates,
            studysetUUID, // ensure ID doesn't change
            _syncStatus:
                existing._syncStatus === 'synced'
                    ? 'pending'
                    : existing._syncStatus,
            _lastModified: Date.now(),
        };

        await this.db.studysets.put(updated);
        return updated;
    }

    async delete(studysetUUID: UUID): Promise<boolean> {
        const existing = await this.db.studysets.get(studysetUUID);
        if (!existing) return false;

        // If it's a local-only record, just delete it
        if (existing._localOnly) {
            await this.db.studysets.delete(studysetUUID);
            return true;
        }

        // Otherwise, mark for deletion sync
        await this.db.studysets.update(studysetUUID, {
            _syncStatus: 'pending', // Will be processed as delete by sync engine
            _lastModified: Date.now(),
        });

        // Add to sync queue as delete operation
        await this.db.syncQueue.add({
            operation: 'delete',
            entityType: 'studyset',
            entityId: studysetUUID,
            payload: { studysetUUID },
            retryCount: 0,
            createdAt: Date.now(),
        });

        return true;
    }

    async hardDelete(studysetUUID: UUID): Promise<void> {
        await this.db.studysets.delete(studysetUUID);
    }

    // ========== Batch Operations ==========

    async bulkCreate(studysets: Studyset[]): Promise<LocalStudyset[]> {
        const localStudysets = studysets.map((s) => ({
            ...s,
            _syncStatus: 'pending' as const,
            _lastModified: Date.now(),
            _localOnly: true as const,
        }));

        await this.db.studysets.bulkPut(localStudysets);
        return localStudysets;
    }

    async bulkUpdate(
        updates: { studysetUUID: UUID; changes: Partial<Studyset> }[]
    ): Promise<void> {
        const now = Date.now();
        const existing = await this.db.studysets.bulkGet(
            updates.map((u) => u.studysetUUID)
        );

        const toUpdate = updates
            .map((update, idx) => {
                const current = existing[idx];
                if (!current) return null;

                return {
                    ...current,
                    ...update.changes,
                    studysetUUID: update.studysetUUID,
                    _syncStatus: (current._syncStatus === 'synced'
                        ? 'pending'
                        : current._syncStatus) as LocalStudyset['_syncStatus'],
                    _lastModified: now,
                };
            })
            .filter(Boolean) as LocalStudyset[];

        if (toUpdate.length > 0) {
            await this.db.studysets.bulkPut(toUpdate);
        }
    }

    async bulkDelete(studysetUUIDs: UUID[]): Promise<void> {
        const existing = await this.db.studysets.bulkGet(studysetUUIDs);
        const now = Date.now();

        // Separate local-only from synced records
        const localOnlyIds: UUID[] = [];
        const syncedIds: { uuid: UUID; studyset: LocalStudyset }[] = [];

        for (let idx = 0; idx < existing.length; idx++) {
            const studyset = existing[idx];
            const uuid = studysetUUIDs[idx];
            if (!studyset || !uuid) continue;
            if (studyset._localOnly) {
                localOnlyIds.push(uuid);
            } else {
                syncedIds.push({ uuid, studyset });
            }
        }

        // Hard delete local-only
        if (localOnlyIds.length > 0) {
            await this.db.studysets.bulkDelete(localOnlyIds);
        }

        // Update synced records as pending and queue for deletion
        if (syncedIds.length > 0) {
            const updates = syncedIds.map((item) => ({
                key: item.uuid,
                changes: {
                    _syncStatus: 'pending' as const,
                    _lastModified: now,
                },
            }));
            await this.db.studysets.bulkUpdate(updates);

            await this.db.syncQueue.bulkAdd(
                syncedIds.map((item) => ({
                    operation: 'delete' as const,
                    entityType: 'studyset' as const,
                    entityId: item.uuid,
                    payload: { studysetUUID: item.uuid },
                    retryCount: 0,
                    createdAt: now,
                }))
            );
        }
    }

    // ========== Sync Helpers ==========

    async markAsSynced(studysetUUID: UUID): Promise<void> {
        await this.db.studysets.update(studysetUUID, {
            _syncStatus: 'synced',
            _localOnly: false,
        });
    }

    async markAsConflict(studysetUUID: UUID): Promise<void> {
        await this.db.studysets.update(studysetUUID, {
            _syncStatus: 'conflict',
        });
    }

    async getPendingChanges(): Promise<LocalStudyset[]> {
        return await this.db.studysets
            .where('_syncStatus')
            .equals('pending')
            .toArray();
    }

    async getConflicts(): Promise<LocalStudyset[]> {
        return await this.db.studysets
            .where('_syncStatus')
            .equals('conflict')
            .toArray();
    }

    // ========== Import/Export Helpers ==========

    async importFromServer(studysets: Studyset[]): Promise<void> {
        const localStudysets = studysets.map((s) => ({
            ...s,
            _syncStatus: 'synced' as const,
            _lastModified: Date.now(),
            _localOnly: false as const,
        }));

        await this.db.studysets.bulkPut(localStudysets);
    }

    // For syncing - get records modified after a timestamp
    async getModifiedSince(timestamp: number): Promise<LocalStudyset[]> {
        return await this.db.studysets
            .where('_lastModified')
            .above(timestamp)
            .toArray();
    }
}

// Singleton instance
export const studysetRepository = new StudysetRepository();
