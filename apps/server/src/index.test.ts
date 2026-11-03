import { afterEach, expect, test } from 'bun:test';
import {
    mkdirSync,
    mkdtempSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import pkg from '../package.json';
import { DB_FILENAME } from './db';

const ENTRY = resolve(import.meta.dir, 'index.ts');
const SHELL = '<!doctype html><title>shell</title>';
const DB_FILES = [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`];
const CLEAN_ENV = {
    ...process.env,
    QZ_PORT: '',
    QZ_DATA_DIR: '',
    QZ_HOST: '',
    QZ_PUBLIC_URL: '',
    QZ_WEB_DIR: '',
};

let root: string | undefined;

afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

async function readUntil(
    stream: ReadableStream<Uint8Array>,
    pattern: RegExp
): Promise<RegExpMatchArray> {
    const decoder = new TextDecoder();
    let output = '';
    for await (const chunk of stream) {
        output += decoder.decode(chunk, { stream: true });
        const match = output.match(pattern);
        if (match) return match;
    }
    throw new Error(`stream ended without matching ${pattern}:\n${output}`);
}

test('serves the app and health check, keeping files inside the data dir', async () => {
    root = mkdtempSync(join(tmpdir(), 'qz-e2e-'));
    const cwd = join(root, 'cwd');
    const dataDir = join(root, 'data');
    const webDir = join(root, 'web');
    mkdirSync(cwd);
    mkdirSync(webDir);
    writeFileSync(join(webDir, 'index.html'), SHELL);

    // process.execPath, not 'bun': on Windows 'bun' can resolve to a .cmd shim, and
    // kill() would then stop the shim and orphan the real server.
    const proc = Bun.spawn(
        [
            process.execPath,
            ENTRY,
            '--port',
            '0',
            '--data-dir',
            dataDir,
            '--web-dir',
            webDir,
        ],
        {
            cwd,
            stdout: 'pipe',
            stderr: 'pipe',
            env: CLEAN_ENV,
        }
    );
    try {
        const [, url, publicUrl] = await readUntil(
            proc.stdout,
            /listening on (http:\/\/\S+) \(public URL (\S+)\)/
        );
        const boundPort = new URL(url!).port;
        expect(boundPort).not.toBe('0');
        expect(publicUrl).toBe(`http://localhost:${boundPort}`);

        const health = await fetch(`${url}/api/health`);
        expect(health.status).toBe(200);
        expect(await health.json()).toEqual({
            status: 'ok',
            version: pkg.version,
        });

        const page = await fetch(`${url}/explore`);
        expect(page.status).toBe(200);
        expect(await page.text()).toBe(SHELL);
    } finally {
        proc.kill();
        await proc.exited;
    }

    expect(readdirSync(cwd)).toEqual([]);
    for (const file of readdirSync(dataDir)) {
        expect(DB_FILES).toContain(file);
    }
}, 20_000);

test('exits with code 1 and names the flag on invalid config', async () => {
    root = mkdtempSync(join(tmpdir(), 'qz-e2e-'));
    const proc = Bun.spawn([process.execPath, ENTRY, '--port', 'abc'], {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        env: CLEAN_ENV,
    });
    expect(await proc.exited).toBe(1);
    expect(await new Response(proc.stderr).text()).toContain('--port');
    expect(readdirSync(root)).toEqual([]);
}, 20_000);
