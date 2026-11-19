import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireDataDirLock, DataDirLockedError } from './data-dir-lock';
import { holdDataDirLock } from './testing/hold-lock';

let root: string | undefined;
afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function dataDir(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-lock-'));
    return join(root, 'data');
}

test('a released lock can be taken again', () => {
    const dir = dataDir();
    acquireDataDirLock(dir).release();
    acquireDataDirLock(dir).release();
});

test('a second holder is refused while another process holds the lock', async () => {
    const dir = dataDir();
    const holder = await holdDataDirLock(dir);
    try {
        expect(() => acquireDataDirLock(dir)).toThrow(DataDirLockedError);
    } finally {
        await holder.stop();
    }
    acquireDataDirLock(dir).release();
}, 20_000);
