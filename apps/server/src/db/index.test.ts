import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import {
    existsSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    closeDatabase,
    DB_FILENAME,
    DEFAULT_MIGRATIONS_FOLDER,
    openDatabase,
} from './index';
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
