import Dexie, { type EntityTable } from 'dexie';
import type {
    Studyset,
    User,
    StudySessionResult,
    CardProgress,
} from 'shared/types';

// Local-first versions of types with sync metadata
export interface LocalStudyset extends Studyset {
    // Sync metadata
    _syncStatus: 'synced' | 'pending' | 'conflict';
    _lastModified: number; // timestamp for sync
    _localOnly?: boolean; // true if created while offline
}

export interface LocalUser extends User {
    _syncStatus: 'synced' | 'pending' | 'conflict';
    _lastModified: number;
}

export interface LocalStudySession extends StudySessionResult {
    _syncStatus: 'synced' | 'pending';
    _lastModified: number;
}

export interface LocalCardProgress extends CardProgress {
    _syncStatus: 'synced' | 'pending';
    _lastModified: number;
    studysetUUID: string;
}

// Database tables interface
interface QuizaroniDatabase extends Dexie {
    studysets: EntityTable<LocalStudyset, 'studysetUUID'>;
    users: EntityTable<LocalUser, 'userUUID'>;
    sessions: EntityTable<LocalStudySession, 'sessionUUID'>;
    cardProgress: EntityTable<LocalCardProgress, 'cardUUID'>;
    syncQueue: EntityTable<
        {
            id: number;
            operation: 'create' | 'update' | 'delete';
            entityType: 'studyset' | 'user';
            entityId: string;
            payload: unknown;
            retryCount: number;
            createdAt: number;
        },
        'id'
    >;
}

const DB_NAME = 'quizaroni_v1';
const DB_VERSION = 2;

let dbInstance: QuizaroniDatabase | null = null;

export function getDatabase(): QuizaroniDatabase {
    if (dbInstance) {
        return dbInstance;
    }

    const db = new Dexie(DB_NAME) as QuizaroniDatabase;

    db.version(DB_VERSION).stores({
        // Primary entities - indexed for common queries
        studysets:
            'studysetUUID, userUUID, _syncStatus, _lastModified, labels, lastViewed',
        users: 'userUUID, _syncStatus, _lastModified',

        // Study session data - analytics/progress
        sessions: 'sessionUUID, studysetUUID, completedAt, _syncStatus',
        cardProgress:
            'cardUUID, studysetUUID, nextReview, _syncStatus, [studysetUUID+nextReview]',

        // Sync queue for offline operations
        syncQueue: '++id, entityType, entityId, createdAt',
    });

    dbInstance = db;
    return db;
}

// Reset database (useful for logout or data reset)
export async function resetDatabase(): Promise<void> {
    const db = getDatabase();
    await db.delete();
    dbInstance = null;
}

// Export all data (for migration/backup)
export async function exportAllData(): Promise<{
    studysets: LocalStudyset[];
    users: LocalUser[];
    sessions: LocalStudySession[];
    cardProgress: LocalCardProgress[];
}> {
    const db = getDatabase();

    const [studysets, users, sessions, cardProgress] = await Promise.all([
        db.studysets.toArray(),
        db.users.toArray(),
        db.sessions.toArray(),
        db.cardProgress.toArray(),
    ]);

    return {
        studysets,
        users,
        sessions,
        cardProgress,
    };
}

// Import data (for migration/restore)
export async function importAllData(data: {
    studysets?: LocalStudyset[];
    users?: LocalUser[];
    sessions?: LocalStudySession[];
    cardProgress?: LocalCardProgress[];
}): Promise<void> {
    const db = getDatabase();

    await db.transaction(
        'rw',
        [db.studysets, db.users, db.sessions, db.cardProgress],
        async () => {
            if (data.studysets?.length) {
                await db.studysets.bulkPut(data.studysets);
            }
            if (data.users?.length) {
                await db.users.bulkPut(data.users);
            }
            if (data.sessions?.length) {
                await db.sessions.bulkPut(data.sessions);
            }
            if (data.cardProgress?.length) {
                await db.cardProgress.bulkPut(data.cardProgress);
            }
        }
    );
}

// Utility: Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
    const db = getDatabase();
    return await db.syncQueue.count();
}

// Utility: Check if any data needs sync
export async function hasPendingSync(): Promise<boolean> {
    const db = getDatabase();
    const [pendingStudysets, pendingUsers, queueCount] = await Promise.all([
        db.studysets.where('_syncStatus').equals('pending').count(),
        db.users.where('_syncStatus').equals('pending').count(),
        db.syncQueue.count(),
    ]);
    return pendingStudysets > 0 || pendingUsers > 0 || queueCount > 0;
}
