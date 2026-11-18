import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { listSyncKeys, makeProbe, syncPath } from './s3';
import { PNG_BYTES, writeS3 } from './testing';

let root: string | undefined;
afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

const KEY = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

test('syncPath keeps keys inside the sync folder', () => {
    const r = '/sync';
    expect(syncPath(r, KEY)).toBe(resolve('/sync', ...KEY.split('/')));
    for (const bad of ['a/../b', '../a', 'a//b', 'a\\b', 'a\0b', '/a', 'a/./b']) {
        expect(syncPath(r, bad)).toBeUndefined();
    }
});

test('makeProbe finds a synced file and reads its head', () => {
    root = mkdtempSync(join(tmpdir(), 'qz-s3-'));
    writeS3(root, KEY, PNG_BYTES);
    const found = makeProbe(root)(KEY);
    expect(found?.size).toBe(PNG_BYTES.length);
    expect(found?.head).toEqual(PNG_BYTES.slice(0, 16));
    expect(makeProbe(root)('missing/key')).toBeUndefined();
    expect(listSyncKeys(root)).toEqual([KEY]);
});
