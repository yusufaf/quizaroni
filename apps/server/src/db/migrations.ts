import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationMeta } from 'drizzle-orm/migrator';
import type { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import type { Db } from './index';

export type JournalEntry = { tag: string; when: number; breakpoints: boolean };
export type Migration = JournalEntry & { sql: string };

export function readJournal(folder: string): JournalEntry[] {
    const journal = JSON.parse(
        readFileSync(join(folder, 'meta', '_journal.json'), 'utf8')
    ) as { entries: JournalEntry[] };
    return journal.entries.map(({ tag, when, breakpoints }) => ({
        tag,
        when,
        breakpoints,
    }));
}

export function readMigrationsFolder(folder: string): Migration[] {
    return readJournal(folder).map((entry) => ({
        ...entry,
        sql: readFileSync(join(folder, `${entry.tag}.sql`), 'utf8'),
    }));
}

// Same shape drizzle's readMigrationFiles builds from a folder, so a DB migrated
// by either path has identical __drizzle_migrations rows.
export function toMigrationMeta(
    migrations: readonly Migration[]
): MigrationMeta[] {
    return migrations.map((m) => ({
        sql: m.sql.split('--> statement-breakpoint'),
        bps: m.breakpoints,
        folderMillis: m.when,
        hash: createHash('sha256').update(m.sql).digest('hex'),
    }));
}

// drizzle only migrates from a folder on disk, which a standalone binary doesn't
// have, so this calls the dialect's migrator (what drizzle's migrate() does).
export function applyMigrations(
    db: Db,
    migrations: readonly Migration[]
): void {
    const { dialect, session } = db as unknown as {
        dialect?: SQLiteSyncDialect;
        session?: Parameters<SQLiteSyncDialect['migrate']>[1];
    };
    if (typeof dialect?.migrate !== 'function' || !session) {
        throw new Error(
            'drizzle-orm internals changed: db.dialect.migrate is missing; update src/db/migrations.ts'
        );
    }
    dialect.migrate(toMigrationMeta(migrations), session);
}
