import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    closeDatabase,
    DatabaseStateError,
    DB_FILENAME,
    DEFAULT_MIGRATIONS_FOLDER,
    openDatabase,
    openExistingDatabase,
} from './index';
import { readMigrationsFolder } from './migrations';
import { instanceSettings } from './schema';

const DB_FILES = [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`];

let root: string | undefined;
let open: Database | undefined;

function tempRoot(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-db-'));
    return root;
}

function track<T extends { sqlite: Database }>(handle: T): T {
    open = handle.sqlite;
    return handle;
}

function migrationRows(sqlite: Database): number {
    return (
        sqlite
            .query('SELECT count(*) AS n FROM __drizzle_migrations')
            .get() as { n: number }
    ).n;
}

afterEach(() => {
    if (open) {
        try {
            closeDatabase(open);
        } catch {
            // already closed by the test
        }
        open = undefined;
    }
    if (root) {
        rmSync(root, { recursive: true, force: true });
        root = undefined;
    }
});

describe('openDatabase', () => {
    test('creates a missing nested data dir and the DB file inside it', () => {
        const dataDir = join(tempRoot(), 'a', 'b');
        track(openDatabase(dataDir));
        expect(existsSync(join(dataDir, DB_FILENAME))).toBe(true);
    });

    test('applies the PRAGMAs', () => {
        const { sqlite } = track(openDatabase(tempRoot()));
        expect(sqlite.query('PRAGMA journal_mode').get()).toEqual({
            journal_mode: 'wal',
        });
        expect(sqlite.query('PRAGMA busy_timeout').get()).toEqual({
            timeout: 5000,
        });
        expect(sqlite.query('PRAGMA foreign_keys').get()).toEqual({
            foreign_keys: 1,
        });
        expect(sqlite.query('PRAGMA synchronous').get()).toEqual({
            synchronous: 1,
        });
    });

    test('creates the invite, mail outbox and reset email log tables', () => {
        const { sqlite } = track(openDatabase(tempRoot()));
        const names = (
            sqlite
                .query(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('registration_invite', 'mail_outbox', 'reset_email_log') ORDER BY name"
                )
                .all() as { name: string }[]
        ).map((r) => r.name);
        expect(names).toEqual([
            'mail_outbox',
            'registration_invite',
            'reset_email_log',
        ]);
    });

    test('runs every migration on boot', () => {
        const { sqlite } = track(openDatabase(tempRoot()));
        const table = sqlite
            .query(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'instance_settings'"
            )
            .get();
        expect(table).toEqual({ name: 'instance_settings' });
        const journal = JSON.parse(
            readFileSync(
                join(DEFAULT_MIGRATIONS_FOLDER, 'meta', '_journal.json'),
                'utf8'
            )
        );
        expect(migrationRows(sqlite)).toBe(journal.entries.length);
    });

    test('reopening an existing data dir does not re-apply migrations', () => {
        const dataDir = tempRoot();
        const first = openDatabase(dataDir);
        const before = migrationRows(first.sqlite);
        closeDatabase(first.sqlite);
        const { sqlite } = track(openDatabase(dataDir));
        expect(migrationRows(sqlite)).toBe(before);
    });

    test('applies an in-memory migration list to a fresh DB', () => {
        const all = readMigrationsFolder(DEFAULT_MIGRATIONS_FOLDER);
        const { sqlite } = track(openDatabase(tempRoot(), all));
        expect(migrationRows(sqlite)).toBe(all.length);
    });

    test('upgrades a DB created with an older migration list', () => {
        const all = readMigrationsFolder(DEFAULT_MIGRATIONS_FOLDER);
        const dataDir = tempRoot();
        const old = openDatabase(dataDir, all.slice(0, 3));
        expect(migrationRows(old.sqlite)).toBe(3);
        closeDatabase(old.sqlite);
        const { sqlite } = track(openDatabase(dataDir));
        expect(migrationRows(sqlite)).toBe(all.length);
        expect(
            sqlite
                .query(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'registration_invite'"
                )
                .get()
        ).toEqual({ name: 'registration_invite' });
    });

    test('keeps every file it creates inside the data dir', () => {
        const dataDir = tempRoot();
        const { db } = track(openDatabase(dataDir));
        db.insert(instanceSettings)
            .values({ key: 'k', value: 'v', updatedAt: new Date() })
            .run();
        for (const file of readdirSync(dataDir)) {
            expect(DB_FILES).toContain(file);
        }
    });
});

describe('closeDatabase', () => {
    test('releases the DB file so the data dir can be removed', () => {
        const dataDir = tempRoot();
        const { sqlite, db } = openDatabase(dataDir);
        db.insert(instanceSettings)
            .values({ key: 'k', value: 'v', updatedAt: new Date() })
            .run();
        closeDatabase(sqlite);
        expect(readdirSync(dataDir)).toEqual([DB_FILENAME]);
        expect(() =>
            rmSync(dataDir, { recursive: true, force: true })
        ).not.toThrow();
        expect(() => sqlite.query('SELECT 1').get()).toThrow();
    });
});

describe('openExistingDatabase', () => {
    const all = readMigrationsFolder(DEFAULT_MIGRATIONS_FOLDER);

    function refusal(fn: () => unknown): DatabaseStateError {
        try {
            fn();
        } catch (err) {
            expect(err).toBeInstanceOf(DatabaseStateError);
            return err as DatabaseStateError;
        }
        throw new Error('expected a DatabaseStateError');
    }

    test('refuses a missing data dir without creating it', () => {
        const dataDir = join(tempRoot(), 'missing');
        expect(refusal(() => openExistingDatabase(dataDir)).message).toContain(
            'No Quizaroni database'
        );
        expect(existsSync(dataDir)).toBe(false);
    });

    test('refuses a data dir with no DB file without creating one', () => {
        const dataDir = join(tempRoot(), 'empty');
        mkdirSync(dataDir);
        refusal(() => openExistingDatabase(dataDir));
        expect(readdirSync(dataDir)).toEqual([]);
    });

    test('opens a current DB with the server PRAGMAs and no migrations', () => {
        const dataDir = join(tempRoot(), 'data');
        closeDatabase(openDatabase(dataDir).sqlite);
        const { sqlite } = track(openExistingDatabase(dataDir));
        expect(
            (sqlite.query('PRAGMA busy_timeout').get() as { timeout: number })
                .timeout
        ).toBe(5000);
        expect(
            (
                sqlite.query('PRAGMA foreign_keys').get() as {
                    foreign_keys: number;
                }
            ).foreign_keys
        ).toBe(1);
        expect(migrationRows(sqlite)).toBe(all.length);
    });

    test('refuses a DB that is behind and leaves it unmigrated', () => {
        const dataDir = join(tempRoot(), 'data');
        closeDatabase(openDatabase(dataDir, all.slice(0, 3)).sqlite);
        expect(
            refusal(() => openExistingDatabase(dataDir, all)).message
        ).toContain('older');
        const sqlite = new Database(join(dataDir, DB_FILENAME), {
            readonly: true,
        });
        try {
            expect(migrationRows(sqlite)).toBe(3);
        } finally {
            sqlite.close();
        }
    });

    test('refuses a DB a newer version upgraded', () => {
        const dataDir = join(tempRoot(), 'data');
        closeDatabase(openDatabase(dataDir, all).sqlite);
        expect(
            refusal(() => openExistingDatabase(dataDir, all.slice(0, 3)))
                .message
        ).toContain('newer');
    });

    test('refuses an empty SQLite file without writing to it', () => {
        const dataDir = join(tempRoot(), 'data');
        mkdirSync(dataDir);
        const file = join(dataDir, DB_FILENAME);
        new Database(file, { create: true }).close();
        expect(refusal(() => openExistingDatabase(dataDir)).message).toContain(
            'no Quizaroni schema'
        );
        expect(statSync(file).size).toBe(0);
        expect(existsSync(`${file}-wal`)).toBe(false);
    });
});
