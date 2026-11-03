import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pkg from '../package.json';
import { createApp } from './app';
import { closeDatabase, openDatabase } from './db';

const SHELL = '<!doctype html><title>shell</title>';
const SENTINEL = 'QZ_SENTINEL_SECRET';

let root: string;
let webDir: string;
let sqlite: Database;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'qz-app-'));
    webDir = join(root, 'web');
    mkdirSync(join(webDir, 'assets'), { recursive: true });
    writeFileSync(join(webDir, 'index.html'), SHELL);
    writeFileSync(join(webDir, 'assets', 'app-abc123.js'), 'console.log(1);');
    writeFileSync(join(webDir, 'sw.js'), 'self.skipWaiting();');
    writeFileSync(join(webDir, 'manifest.json'), '{}');
    writeFileSync(join(root, 'secret.txt'), SENTINEL);
    sqlite = openDatabase(join(root, 'data')).sqlite;
    app = createApp({ sqlite, webDir, version: pkg.version });
});

afterAll(() => {
    closeDatabase(sqlite);
    rmSync(root, { recursive: true, force: true });
});

describe('/api', () => {
    test('GET /api/health reports ok and the package version', async () => {
        const res = await app.request('/api/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            status: 'ok',
            version: pkg.version,
        });
    });

    test('GET /api/health returns 503 when the database is unusable', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'qz-app-closed-'));
        try {
            const closed = openDatabase(dir).sqlite;
            closeDatabase(closed);
            const res = await createApp({
                sqlite: closed,
                webDir,
                version: pkg.version,
            }).request('/api/health');
            expect(res.status).toBe(503);
            expect(await res.json()).toEqual({
                status: 'error',
                version: pkg.version,
            });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test.each([
        ['GET', '/api/nope'],
        ['POST', '/api/nope'],
        ['GET', '/api'],
        ['GET', '/api/'],
    ])('%s %s returns 404 JSON', async (method, path) => {
        const res = await app.request(path, { method });
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(await res.json()).toEqual({ message: 'Not found' });
    });
});

describe('web app', () => {
    test('GET / serves the shell without long-term caching', async () => {
        const res = await app.request('/');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe(SHELL);
        expect(res.headers.get('cache-control')).toContain('max-age=0');
    });

    test.each([
        ['/explore'],
        ['/view/abc123'],
        ['/study/s1/flashcards'],
        ['/apix'],
    ])('GET %s falls back to the shell', async (path) => {
        const res = await app.request(path);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('cache-control')).toBe(
            'public, max-age=0, must-revalidate'
        );
        expect(await res.text()).toBe(SHELL);
    });

    test('serves hashed assets as immutable', async () => {
        const res = await app.request('/assets/app-abc123.js');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('javascript');
        expect(res.headers.get('cache-control')).toBe(
            'public, max-age=31536000, immutable'
        );
        const head = await app.request('/assets/app-abc123.js', {
            method: 'HEAD',
        });
        expect(head.status).toBe(200);
    });

    test('serves the service worker with revalidation', async () => {
        const res = await app.request('/sw.js');
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe(
            'public, max-age=0, must-revalidate'
        );
    });

    test.each([['/assets/missing.js'], ['/sitemap.xml']])(
        'GET %s returns 404, not the shell',
        async (path) => {
            const res = await app.request(path);
            expect(res.status).toBe(404);
            expect(await res.text()).not.toBe(SHELL);
        }
    );

    test.each([
        ['/..%2fsecret.txt'],
        ['/..%5csecret.txt'],
        ['/assets/..%2f..%2fsecret.txt'],
    ])('GET %s does not escape the web dir', async (path) => {
        expect(existsSync(join(webDir, '..', 'secret.txt'))).toBe(true);
        const res = await app.request(path);
        expect(res.status).not.toBe(200);
        expect(await res.text()).not.toContain(SENTINEL);
    });

    test('POST to an app route returns 404', async () => {
        const res = await app.request('/explore', { method: 'POST' });
        expect(res.status).toBe(404);
    });

    test('returns 503 when the web app has not been built', async () => {
        const emptyWebDir = join(root, 'empty-web');
        mkdirSync(emptyWebDir, { recursive: true });
        const res = await createApp({
            sqlite,
            webDir: emptyWebDir,
            version: pkg.version,
        }).request('/explore');
        expect(res.status).toBe(503);
    });
});
