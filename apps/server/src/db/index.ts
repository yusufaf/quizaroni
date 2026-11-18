import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import {
    applyMigrations,
    type Migration,
    readMigrationsFolder,
} from './migrations';
import * as schema from './schema';

export type { Migration } from './migrations';

export const DB_FILENAME = 'quizaroni.db';
export const DEFAULT_MIGRATIONS_FOLDER = resolve(
    import.meta.dir,
    '../../drizzle'
);

export type Db = BunSQLiteDatabase<typeof schema>;

export function openDatabase(
    dataDir: string,
    migrations: readonly Migration[] = readMigrationsFolder(
        DEFAULT_MIGRATIONS_FOLDER
    )
): { sqlite: Database; db: Db } {
    mkdirSync(dataDir, { recursive: true });
    const sqlite = new Database(join(dataDir, DB_FILENAME), {
        create: true,
        strict: true,
    });
    try {
        configure(sqlite);
        const db = drizzle({ client: sqlite, schema });
        applyMigrations(db, migrations);
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

function configure(sqlite: Database): void {
    sqlite.run('PRAGMA journal_mode = WAL');
    sqlite.run('PRAGMA busy_timeout = 5000');
    sqlite.run('PRAGMA foreign_keys = ON');
    sqlite.run('PRAGMA synchronous = NORMAL');
}

/** The DB can't be used as-is: missing, not set up, or on another version's schema. */
export class DatabaseStateError extends Error {}

export type SchemaState = 'current' | 'behind' | 'ahead' | 'uninitialised';

export function schemaState(
    sqlite: Database,
    migrations: readonly Migration[]
): SchemaState {
    const table = sqlite
        .query(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'"
        )
        .get();
    if (table === null) return 'uninitialised';
    const { last } = sqlite
        .query('SELECT max(created_at) AS last FROM __drizzle_migrations')
        .get() as { last: number | string | null };
    if (last === null) return 'uninitialised';
    const latest = migrations.at(-1)?.when ?? 0;
    const applied = Number(last);
    if (applied === latest) return 'current';
    return applied < latest ? 'behind' : 'ahead';
}

/**
 * Opens the DB a server already set up, for tools that run alongside it: never
 * creates the file or its dir and never migrates, so it can't race the server.
 */
export function openExistingDatabase(
    dataDir: string,
    migrations: readonly Migration[] = readMigrationsFolder(
        DEFAULT_MIGRATIONS_FOLDER
    )
): { sqlite: Database; db: Db } {
    const file = join(dataDir, DB_FILENAME);
    if (!existsSync(file)) {
        throw new DatabaseStateError(
            `No Quizaroni database in ${dataDir}. Pass the server's data directory with --data-dir or QZ_DATA_DIR.`
        );
    }
    const sqlite = new Database(file, {
        readwrite: true,
        create: false,
        strict: true,
    });
    try {
        // journal_mode=WAL writes to the file, so the other PRAGMAs wait until
        // the schema check has shown the file is ours.
        sqlite.run('PRAGMA busy_timeout = 5000');
        const state = schemaState(sqlite, migrations);
        if (state !== 'current') {
            throw new DatabaseStateError(
                {
                    uninitialised: `${file} has no Quizaroni schema; start the server once first.`,
                    behind: `The database in ${dataDir} is older than this quizaroni; start this version's server once to upgrade it, then retry.`,
                    ahead: `The database in ${dataDir} was upgraded by a newer Quizaroni; run that version's quizaroni instead.`,
                }[state]
            );
        }
        configure(sqlite);
        return { sqlite, db: drizzle({ client: sqlite, schema }) };
    } catch (err) {
        try {
            closeDatabase(sqlite);
        } catch {
            // keep the original error
        }
        throw err;
    }
}

/** A migrated, throwaway DB: what a dry run writes into to hit the real constraints. */
export function openMemoryDatabase(
    migrations: readonly Migration[] = readMigrationsFolder(
        DEFAULT_MIGRATIONS_FOLDER
    )
): { sqlite: Database; db: Db } {
    const sqlite = new Database(':memory:', { strict: true });
    sqlite.run('PRAGMA foreign_keys = ON');
    const db = drizzle({ client: sqlite, schema });
    applyMigrations(db, migrations);
    return { sqlite, db };
}

// A plain close() leaves the file handle open on Windows once Drizzle has prepared
// statements, so the data dir can't be removed; close(true) finalizes them first.
export function closeDatabase(sqlite: Database): void {
    sqlite.close(true);
}
