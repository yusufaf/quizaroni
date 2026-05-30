import { getDatabase, type LocalUser } from '../db';
import type { User, UUID } from 'shared/types';

export class UserRepository {
    private db = getDatabase();

    // ========== Read Operations ==========

    async getById(userUUID: UUID): Promise<LocalUser | undefined> {
        return await this.db.users.get(userUUID);
    }

    async getCurrentUser(): Promise<LocalUser | undefined> {
        // Get first user (typically only one in local-first mode)
        const users = await this.db.users.limit(1).toArray();
        return users[0];
    }

    // ========== Write Operations ==========

    async create(user: User): Promise<LocalUser> {
        const localUser: LocalUser = {
            ...user,
            _syncStatus: 'pending',
            _lastModified: Date.now(),
        };

        await this.db.users.put(localUser);
        return localUser;
    }

    async update(
        userUUID: UUID,
        updates: Partial<User>
    ): Promise<LocalUser | undefined> {
        const existing = await this.db.users.get(userUUID);
        if (!existing) return undefined;

        const updated: LocalUser = {
            ...existing,
            ...updates,
            userUUID, // ensure ID doesn't change
            _syncStatus:
                existing._syncStatus === 'synced'
                    ? 'pending'
                    : existing._syncStatus,
            _lastModified: Date.now(),
        };

        await this.db.users.put(updated);
        return updated;
    }

    async updateMetadata(
        userUUID: UUID,
        metadataUpdates: Record<string, unknown>
    ): Promise<LocalUser | undefined> {
        const existing = await this.db.users.get(userUUID);
        if (!existing) return undefined;

        const updated: LocalUser = {
            ...existing,
            metadata: {
                ...existing.metadata,
                ...metadataUpdates,
            },
            _syncStatus:
                existing._syncStatus === 'synced'
                    ? 'pending'
                    : existing._syncStatus,
            _lastModified: Date.now(),
        };

        await this.db.users.put(updated);
        return updated;
    }

    async delete(userUUID: UUID): Promise<boolean> {
        const count = await this.db.users
            .where('userUUID')
            .equals(userUUID)
            .delete();
        return count > 0;
    }

    // ========== Sync Helpers ==========

    async markAsSynced(userUUID: UUID): Promise<void> {
        await this.db.users.update(userUUID, {
            _syncStatus: 'synced',
        });
    }

    async getPendingChanges(): Promise<LocalUser[]> {
        return await this.db.users
            .where('_syncStatus')
            .equals('pending')
            .toArray();
    }

    // ========== Import/Export ==========

    async importFromServer(user: User): Promise<void> {
        const localUser: LocalUser = {
            ...user,
            _syncStatus: 'synced',
            _lastModified: Date.now(),
        };

        await this.db.users.put(localUser);
    }
}

// Singleton instance
export const userRepository = new UserRepository();
