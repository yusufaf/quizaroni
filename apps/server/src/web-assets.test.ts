import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diskWebAssets, embeddedWebAssets } from './web-assets';

const root = mkdtempSync(join(tmpdir(), 'qz-web-assets-'));
const index = join(root, 'index.html');

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('readShell', () => {
    test('re-reads the shell from disk on every call', async () => {
        writeFileSync(index, 'one');
        const web = diskWebAssets(root);
        expect(await web.readShell()).toBe('one');
        writeFileSync(index, 'two');
        expect(await web.readShell()).toBe('two');
    });

    test('reads the embedded shell once', async () => {
        writeFileSync(index, 'one');
        const web = embeddedWebAssets(new Map([['/index.html', index]]));
        expect(await web.readShell()).toBe('one');
        writeFileSync(index, 'two');
        expect(await web.readShell()).toBe('one');
    });
});
