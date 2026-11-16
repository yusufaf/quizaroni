import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { DEFAULT_MIGRATIONS_FOLDER, type Db } from './index';
import {
    applyMigrations,
    readJournal,
    readMigrationsFolder,
    toMigrationMeta,
} from './migrations';

describe('migrations', () => {
    test('match what drizzle reads from the folder', () => {
        expect(
            toMigrationMeta(readMigrationsFolder(DEFAULT_MIGRATIONS_FOLDER))
        ).toEqual(
            readMigrationFiles({ migrationsFolder: DEFAULT_MIGRATIONS_FOLDER })
        );
    });

    test('the journal is in time order and every entry has its SQL file', () => {
        const journal = readJournal(DEFAULT_MIGRATIONS_FOLDER);
        expect(journal.length).toBeGreaterThanOrEqual(7);
        for (let i = 1; i < journal.length; i++) {
            expect(journal[i]!.when).toBeGreaterThan(journal[i - 1]!.when);
        }
        for (const { tag } of journal) {
            expect(existsSync(join(DEFAULT_MIGRATIONS_FOLDER, `${tag}.sql`))).toBe(
                true
            );
        }
    });

    test('fails clearly if drizzle no longer exposes its migrator', () => {
        expect(() => applyMigrations({} as Db, [])).toThrow(
            /drizzle-orm internals changed/
        );
    });
});
