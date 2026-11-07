import { FileStore } from './files/store';
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
import { testAuth } from './auth/testing';
import { closeDatabase, type Db, openDatabase } from './db';
import { completeSetup, SetupGate } from './setup/setup';

const SHELL = '<!doctype html><title>shell</title>';
const SENTINEL = 'QZ_SENTINEL_SECRET';

let root: string;
let webDir: string;
let sqlite: Database;
let db: Db;
let setup: SetupGate;
let app: ReturnType<typeof createApp>;

function latchedGate(database: Db): SetupGate {
    const gate = new SetupGate(database, undefined);
    gate.markComplete();
    return gate;
}

beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'qz-app-'));
    webDir = join(root, 'web');
    mkdirSync(join(webDir, 'assets'), { recursive: true });
    writeFileSync(join(webDir, 'index.html'), SHELL);
    writeFileSync(join(webDir, 'assets', 'app-abc123.js'), 'console.log(1);');
    writeFileSync(join(webDir, 'sw.js'), 'self.skipWaiting();');
    writeFileSync(join(webDir, 'manifest.json'), '{}');
    writeFileSync(join(root, 'secret.txt'), SENTINEL);
    ({ sqlite, db } = openDatabase(join(root, 'data')));
    completeSetup(db, {
        name: 'Admin',
        email: 'admin@example.com',
        passwordHash: 'not-a-real-hash',
        registrationMode: 'invite_only',
        teacherPolicy: 'admin_approved',
        publicUrl: undefined,
    });
    setup = new SetupGate(db, undefined);
    app = createApp({
        sqlite,
        db,
        files: new FileStore(join(root, 'data')),
        webDir,
        version: pkg.version,
        setup,
        auth: testAuth(db),
        trustProxy: false,
    });
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
            const closed = openDatabase(dir);
            closeDatabase(closed.sqlite);
            const res = await createApp({
                sqlite: closed.sqlite,
                db: closed.db,
                files: new FileStore(dir),
                webDir,
                version: pkg.version,
                setup: latchedGate(closed.db),
                auth: testAuth(closed.db),
                trustProxy: false,
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
        const res = await app.request(path, {
            method,
            headers:
                method === 'POST'
                    ? { 'Content-Type': 'application/json' }
                    : undefined,
        });
        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(await res.json()).toEqual({ message: 'Not found' });
    });

    test('POST /api/nope without a JSON content type is refused before routing', async () => {
        const res = await app.request('/api/nope', { method: 'POST' });
        expect(res.status).toBe(415);
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

    test('GET /sitemap.xml lists the home page as XML', async () => {
        const res = await app.request('/sitemap.xml');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/xml');
        expect(await res.text()).toContain('<urlset');
    });

    test.each([['/assets/missing.js'], ['/favicon-missing.ico']])(
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
            db,
            files: new FileStore(join(root, 'data')),
            webDir: emptyWebDir,
            version: pkg.version,
            setup,
            auth: testAuth(db),
            trustProxy: false,
        }).request('/explore');
        expect(res.status).toBe(503);
    });
});
