import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';

export const DB_FILENAME = 'quizaroni.db';
export const DEFAULT_MIGRATIONS_FOLDER = resolve(
    import.meta.dir,
    '../../drizzle'
);

export type Db = BunSQLiteDatabase<typeof schema>;

export function openDatabase(
    dataDir: string,
    migrationsFolder = DEFAULT_MIGRATIONS_FOLDER
): { sqlite: Database; db: Db } {
    mkdirSync(dataDir, { recursive: true });
    const sqlite = new Database(join(dataDir, DB_FILENAME), {
        create: true,
        strict: true,
    });
    try {
        sqlite.run('PRAGMA journal_mode = WAL');
        sqlite.run('PRAGMA busy_timeout = 5000');
        sqlite.run('PRAGMA foreign_keys = ON');
        sqlite.run('PRAGMA synchronous = NORMAL');
        const db = drizzle({ client: sqlite, schema });
        migrate(db, { migrationsFolder });
        return { sqlite, db };
    } catch (err) {
        try {
            closeDatabase(sqlite);
        } catch {
            // keep the original error
        }
        throw err;
    }
}

// A plain close() leaves the file handle open on Windows once Drizzle has prepared
// statements, so the data dir can't be removed; close(true) finalizes them first.
export function closeDatabase(sqlite: Database): void {
    sqlite.close(true);
}
