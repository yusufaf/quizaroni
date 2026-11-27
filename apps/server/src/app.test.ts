import { FileStore } from './files/store';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pkg from '../package.json';
import { createApp } from './app';
import { testAuth } from './auth/testing';
import { Mailer } from './mail/mailer';
import { closeDatabase, type Db, openDatabase } from './db';
import { completeSetup, SetupGate } from './setup/setup';
import { diskWebAssets, embeddedWebAssets } from './web-assets';

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
        web: diskWebAssets(webDir),
        version: pkg.version,
        setup,
        auth: testAuth(db),
        trustProxy: false,
        mailer: new Mailer(db, undefined),
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
                web: diskWebAssets(webDir),
                version: pkg.version,
                setup: latchedGate(closed.db),
                auth: testAuth(closed.db),
                trustProxy: false,
                mailer: new Mailer(closed.db, undefined),
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
            web: diskWebAssets(emptyWebDir),
            version: pkg.version,
            setup,
            auth: testAuth(db),
            trustProxy: false,
            mailer: new Mailer(db, undefined),
        }).request('/explore');
        expect(res.status).toBe(503);
    });
});

describe('SPA routes', () => {
    const webSource = (p: string) =>
        readFileSync(new URL(`../../web/src/${p}`, import.meta.url), 'utf8');

    // Read as text: importing the web modules would pull its path aliases into bun.
    const appRoutes = [
        ...webSource('AppRoutes.tsx').matchAll(
            /\bpath(?:=|:\s*)["']([^"']+)["']/g
        ),
    ]
        .map((m) => m[1]!)
        .filter((path) => path !== '*');

    const routesBlock =
        webSource('shared/constants/index.ts').match(
            /export const ROUTES = \{([^}]*)\}/
        )?.[1] ?? '';
    const linkRoutes = [...routesBlock.matchAll(/["']([^"']+)["']/g)].map(
        (m) => m[1]!
    );

    const samplePath = (path: string) =>
        path.replace(/:[^/]+/g, '00000000-0000-4000-8000-000000000000');

    test('finds the routes in AppRoutes.tsx', () => {
        expect(appRoutes).toEqual(
            expect.arrayContaining([
                '/login',
                '/view/:id',
                '/study/:studysetId/:mode',
                '/admin',
            ])
        );
        expect(linkRoutes.length).toBeGreaterThan(0);
    });

    test.each([...new Set([...appRoutes, ...linkRoutes])])(
        'GET %s serves the app shell',
        async (route) => {
            const res = await app.request(samplePath(route));
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/html');
        }
    );
});

describe('embedded web app', () => {
    let embedded: ReturnType<typeof createApp>;

    const build = (files: ReadonlyMap<string, string>) =>
        createApp({
            sqlite,
            db,
            files: new FileStore(join(root, 'data')),
            web: embeddedWebAssets(files),
            version: pkg.version,
            setup,
            auth: testAuth(db),
            trustProxy: false,
            mailer: new Mailer(db, undefined),
        });

    beforeAll(() => {
        embedded = build(
            new Map([
                ['/index.html', join(webDir, 'index.html')],
                [
                    '/assets/app-abc123.js',
                    join(webDir, 'assets', 'app-abc123.js'),
                ],
                ['/sw.js', join(webDir, 'sw.js')],
                ['/manifest.json', join(webDir, 'manifest.json')],
            ])
        );
    });

    test.each([['/'], ['/explore']])(
        'GET %s serves the shell',
        async (path) => {
            const res = await embedded.request(path);
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/html');
            expect(await res.text()).toBe(SHELL);
        }
    );

    test('serves hashed assets as immutable', async () => {
        const res = await embedded.request('/assets/app-abc123.js');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('javascript');
        expect(res.headers.get('cache-control')).toBe(
            'public, max-age=31536000, immutable'
        );
    });

    test('serves the service worker with revalidation', async () => {
        const res = await embedded.request('/sw.js');
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe(
            'public, max-age=0, must-revalidate'
        );
    });

    test('GET /assets/missing.js returns 404, not the shell', async () => {
        const res = await embedded.request('/assets/missing.js');
        expect(res.status).toBe(404);
        expect(await res.text()).not.toBe(SHELL);
    });

    test.each([
        ['/..%2fsecret.txt'],
        ['/..%5csecret.txt'],
        ['/assets/..%2f..%2fsecret.txt'],
    ])('GET %s does not escape the embedded files', async (path) => {
        const res = await embedded.request(path);
        expect(res.status).not.toBe(200);
        expect(await res.text()).not.toContain(SENTINEL);
    });

    test('returns 503 when nothing is embedded', async () => {
        const res = await build(new Map()).request('/explore');
        expect(res.status).toBe(503);
    });
});
