import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const LOCK_FILENAME = 'server.lock';

/** Another server or an import already holds the data dir. */
export class DataDirLockedError extends Error {}

export type DataDirLock = { release(): void };

/**
 * Takes an exclusive SQLite lock on a file next to the DB. The OS drops it when
 * the holder exits or crashes, so there is no stale lock to clean up. Callers
 * must keep the returned object reachable: a collected handle releases the lock.
 */
export function acquireDataDirLock(dataDir: string): DataDirLock {
    mkdirSync(dataDir, { recursive: true });
    const db = new Database(join(dataDir, LOCK_FILENAME), { create: true });
    try {
        db.run('PRAGMA busy_timeout = 0');
        // Nothing is stored here: an in-memory journal means a killed holder leaves
        // only the lock file (journal_mode=OFF doesn't take on an empty file).
        db.run('PRAGMA journal_mode = MEMORY');
        db.run('PRAGMA locking_mode = EXCLUSIVE');
        db.run('BEGIN EXCLUSIVE');
        db.run('COMMIT');
    } catch (err) {
        db.close();
        if ((err as { code?: string }).code?.startsWith('SQLITE_BUSY')) {
            throw new DataDirLockedError(
                `Another Quizaroni server or import is using ${dataDir}.`
            );
        }
        throw err;
    }
    return { release: () => db.close() };
}
