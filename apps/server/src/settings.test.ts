import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDatabase, type Db, openDatabase } from './db';
import {
    ensureAuthSecret,
    getSetting,
    insertSettings,
    SETTING,
} from './settings';

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

describe('ensureAuthSecret', () => {
    test('creates a long random secret once and returns it after that', () => {
        const db = freshDb();
        const first = ensureAuthSecret(db);
        expect(first.length).toBeGreaterThanOrEqual(43);
        expect(ensureAuthSecret(db)).toBe(first);
        expect(getSetting(db, SETTING.authSecret)).toBe(first);
    });

    test('keeps the secret across reopening the database', () => {
        const db = freshDb();
        const first = ensureAuthSecret(db);
        closeDatabase(sqlite!);
        const reopened = openDatabase(root!);
        sqlite = reopened.sqlite;
        expect(ensureAuthSecret(reopened.db)).toBe(first);
    });
});
