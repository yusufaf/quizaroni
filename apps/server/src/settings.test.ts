import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, type Db, openDatabase } from './db';
import { getSetting, insertSettings, SETTING } from './settings';

let root: string | undefined;
let sqlite: Database | undefined;

function freshDb(): Db {
    root = mkdtempSync(join(tmpdir(), 'qz-settings-'));
    const opened = openDatabase(root);
    sqlite = opened.sqlite;
    return opened.db;
}

afterEach(() => {
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

describe('settings', () => {
    test('round-trips a value', () => {
        const db = freshDb();
        insertSettings(db, { registrationMode: 'open' }, new Date());
        expect(getSetting(db, SETTING.registrationMode)).toBe('open');
    });

    test('returns undefined for a missing key', () => {
        expect(getSetting(freshDb(), SETTING.publicUrl)).toBeUndefined();
    });

    test('refuses to overwrite an existing key', () => {
        const db = freshDb();
        insertSettings(db, { setupCompletedAt: '1' }, new Date());
        expect(() =>
            insertSettings(db, { setupCompletedAt: '2' }, new Date())
        ).toThrow();
        expect(getSetting(db, SETTING.setupCompletedAt)).toBe('1');
    });
});
