import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app';
import { hashPassword } from '../auth/auth';
import { ipEnv, nextTestIp, testAuth } from '../auth/testing';
import { closeDatabase, type Db, openDatabase } from '../db';
import { FileStore } from '../files/store';
import { UploadRegistry } from '../files/uploads';
import { instanceSettings } from '../db/schema';
import { SETTING } from '../settings';
import { completeSetup, SetupGate } from '../setup/setup';

// Test helpers only: a set-up instance with open registration, driven over
// app.request() with a same-origin JSON POST, as the web app sends.

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'correct-horse-1';
export const PUBLIC_URL = 'http://localhost';

export type RouteHarness = {
    app: ReturnType<typeof createApp>;
    db: Db;
    files: FileStore;
    uploads: UploadRegistry;
    close(): void;
};

export async function createRouteHarness(): Promise<RouteHarness> {
    const root = mkdtempSync(join(tmpdir(), 'qz-routes-'));
    const webDir = join(root, 'web');
    mkdirSync(webDir, { recursive: true });
    writeFileSync(join(webDir, 'index.html'), '<!doctype html>');
    const opened = openDatabase(join(root, 'data'));
    completeSetup(opened.db, {
        name: 'Admin',
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        registrationMode: 'open',
        teacherPolicy: 'admin_approved',
        publicUrl: undefined,
    });
    opened.db
        .insert(instanceSettings)
        .values({
            key: SETTING.registrationMode,
            value: 'open',
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: instanceSettings.key,
            set: { value: 'open' },
        })
        .run();
    const files = new FileStore(join(root, 'data'));
    files.resetStaging();
    const uploads = new UploadRegistry(files);
    const app = createApp({
        sqlite: opened.sqlite,
        db: opened.db,
        files,
        uploads,
        webDir,
        version: '0.0.0-test',
        setup: new SetupGate(opened.db, undefined),
        auth: testAuth(opened.db, { publicUrl: PUBLIC_URL }),
        trustProxy: false,
    });
    return {
        app,
        db: opened.db,
        files,
        uploads,
        close() {
            closeDatabase(opened.sqlite);
            rmSync(root, { recursive: true, force: true });
        },
    };
}

export type CallOptions = {
    body?: unknown;
    rawBody?: string;
    cookie?: string;
    headers?: Record<string, string>;
};

export function apiRequest(
    h: RouteHarness,
    path: string,
    o: CallOptions = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        Origin: PUBLIC_URL,
        'Content-Type': 'application/json',
        ...o.headers,
    };
    if (o.cookie) headers.Cookie = o.cookie;
    return Promise.resolve(
        h.app.request(
            `http://localhost${path}`,
            {
                method: 'POST',
                headers,
                body: o.rawBody ?? JSON.stringify(o.body ?? {}),
            },
            ipEnv(nextTestIp())
        )
    );
}

export function cookieFrom(res: Response): string {
    return res.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
}

let signupCounter = 0;

export async function signUp(
    h: RouteHarness
): Promise<{ cookie: string; email: string; password: string }> {
    const email = `ada${++signupCounter}@example.com`;
    const password = 'ada-password-1';
    const res = await apiRequest(h, '/api/auth/sign-up/email', {
        body: { name: 'Ada', email, password },
    });
    if (res.status !== 200) {
        throw new Error(`sign-up failed with ${res.status}`);
    }
    return { cookie: cookieFrom(res), email, password };
}

export async function signIn(
    h: RouteHarness,
    email: string,
    password: string
): Promise<string> {
    const res = await apiRequest(h, '/api/auth/sign-in/email', {
        body: { email, password },
    });
    if (res.status !== 200) {
        throw new Error(`sign-in failed with ${res.status}`);
    }
    return cookieFrom(res);
}

export function apiGet(
    h: RouteHarness,
    path: string,
    o: { cookie?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
    const headers: Record<string, string> = { ...o.headers };
    if (o.cookie) headers.Cookie = o.cookie;
    return Promise.resolve(
        h.app.request(
            `http://localhost${path}`,
            { method: 'GET', headers },
            ipEnv(nextTestIp())
        )
    );
}

// A raw-bytes PUT, as the browser sends a part: same origin, no JSON.
export function apiPut(
    h: RouteHarness,
    path: string,
    bytes: Uint8Array,
    o: { cookie?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        Origin: PUBLIC_URL,
        ...o.headers,
    };
    if (o.cookie) headers.Cookie = o.cookie;
    return Promise.resolve(
        h.app.request(
            `http://localhost${path}`,
            { method: 'PUT', headers, body: bytes },
            ipEnv(nextTestIp())
        )
    );
}
