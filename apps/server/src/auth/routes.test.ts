import { FileStore } from '../files/store';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, eq } from 'drizzle-orm';
import { createApp } from '../app';
import { closeDatabase, type Db, openDatabase } from '../db';
import { account, instanceSettings, session, user } from '../db/schema';
import { SETTING } from '../settings';
import { completeSetup, SetupGate } from '../setup/setup';
import { hashPassword } from './auth';
import { ipEnv, nextTestIp, testAuth } from './testing';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'correct-horse-1';
const EVIL = 'https://evil.example';
const PROXIED_URL = 'https://quiz.example.org';
const INTERNAL = 'http://127.0.0.1:8080';

type Harness = {
    app: ReturnType<typeof createApp>;
    db: Db;
    sqlite: Database;
    publicUrl: string;
};

let root: string | undefined;
let sqlite: Database | undefined;

async function harness(
    o: {
        publicUrl?: string;
        insecureCookies?: boolean;
        trustProxy?: boolean;
        setUp?: boolean;
    } = {}
): Promise<Harness> {
    root = mkdtempSync(join(tmpdir(), 'qz-auth-routes-'));
    const webDir = join(root, 'web');
    mkdirSync(webDir, { recursive: true });
    writeFileSync(join(webDir, 'index.html'), '<!doctype html>');
    const opened = openDatabase(join(root, 'data'));
    sqlite = opened.sqlite;
    const setUp = o.setUp ?? true;
    if (setUp) {
        completeSetup(opened.db, {
            name: 'Admin',
            email: ADMIN_EMAIL,
            passwordHash: await hashPassword(ADMIN_PASSWORD),
            registrationMode: 'invite_only',
            teacherPolicy: 'admin_approved',
            publicUrl: undefined,
        });
    }
    const publicUrl = o.publicUrl ?? 'http://localhost';
    const app = createApp({
        sqlite: opened.sqlite,
        db: opened.db,
        files: new FileStore(join(root, 'data')),
        webDir,
        version: '0.0.0-test',
        setup: new SetupGate(opened.db, setUp ? undefined : 'token'),
        auth: testAuth(opened.db, {
            publicUrl,
            insecureCookies: o.insecureCookies,
        }),
        trustProxy: o.trustProxy ?? false,
    });
    return { app, db: opened.db, sqlite: opened.sqlite, publicUrl };
}

afterEach(() => {
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function setRegistrationMode(db: Db, mode: string | undefined): void {
    if (mode === undefined) {
        db.delete(instanceSettings)
            .where(eq(instanceSettings.key, SETTING.registrationMode))
            .run();
        return;
    }
    db.insert(instanceSettings)
        .values({
            key: SETTING.registrationMode,
            value: mode,
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: instanceSettings.key,
            set: { value: mode },
        })
        .run();
}

type CallOptions = {
    method?: string;
    body?: unknown;
    rawBody?: string | ReadableStream<Uint8Array>;
    headers?: Record<string, string | undefined>;
    cookie?: string;
    ip?: string;
    base?: string;
};

async function call(
    h: Harness,
    path: string,
    o: CallOptions = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        Origin: h.publicUrl,
        'Content-Type': 'application/json',
    };
    for (const [name, value] of Object.entries(o.headers ?? {})) {
        if (value === undefined) delete headers[name];
        else headers[name] = value;
    }
    if (o.cookie) headers.Cookie = o.cookie;
    const method = o.method ?? 'POST';
    const init: RequestInit = { method, headers };
    if (method !== 'GET') {
        init.body = o.rawBody ?? JSON.stringify(o.body ?? {});
    }
    if (o.rawBody instanceof ReadableStream) {
        (init as { duplex?: string }).duplex = 'half';
    }
    return h.app.request(
        `${o.base ?? 'http://localhost'}/api/auth${path}`,
        init,
        ipEnv(o.ip ?? nextTestIp())
    );
}

function cookieFrom(res: Response): string {
    return res.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
}

function sessionCookie(res: Response): string | undefined {
    return res.headers
        .getSetCookie()
        .find((c) => c.includes('quizaroni.session_token='));
}

const signIn = (h: Harness, o: CallOptions = {}) =>
    call(h, '/sign-in/email', {
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        ...o,
    });

let signupCounter = 0;
const signUp = (h: Harness, body: Record<string, unknown> = {}, o = {}) =>
    call(h, '/sign-up/email', {
        body: {
            name: 'Ada',
            email: `ada${++signupCounter}@example.com`,
            password: 'ada-password-1',
            ...body,
        },
        ...o,
    });

function sessionCount(db: Db): number {
    return db.select({ n: count() }).from(session).get()!.n;
}

function lastSessionIp(sqliteDb: Database): string | null {
    return (
        sqliteDb
            .query(
                'SELECT ip_address FROM session ORDER BY created_at DESC LIMIT 1'
            )
            .get() as { ip_address: string | null }
    ).ip_address;
}

async function getSession(h: Harness, cookie?: string, base?: string) {
    const res = await call(h, '/get-session', { method: 'GET', cookie, base });
    expect(res.status).toBe(200);
    return (await res.json()) as {
        user: { id: string; email: string; role: string };
    } | null;
}

describe('sign up', () => {
    test('creates a user with a Secure session cookie when registration is open', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        const res = await signUp(h, { email: 'new@example.com' });
        expect(res.status).toBe(200);
        const cookie = sessionCookie(res)!;
        expect(cookie).toStartWith('__Secure-quizaroni.session_token=');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');

        const row = h.db
            .select()
            .from(user)
            .where(eq(user.email, 'new@example.com'))
            .get()!;
        expect(row.role).toBe('user');
        expect(row.emailVerified).toBe(false);
        expect(row.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        const accounts = h.db
            .select()
            .from(account)
            .where(eq(account.userId, row.id))
            .all();
        expect(accounts).toHaveLength(1);
        expect(accounts[0]!.providerId).toBe('credential');
        expect(accounts[0]!.accountId).toBe(row.id);
        expect(accounts[0]!.password).toStartWith('$argon2id$');
    });

    test('ignores a role in the sign-up body', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        const res = await signUp(h, {
            email: 'sneaky@example.com',
            role: 'admin',
        });
        expect(res.status).toBe(200);
        const row = h.db
            .select()
            .from(user)
            .where(eq(user.email, 'sneaky@example.com'))
            .get()!;
        expect(row.role).toBe('user');
    });

    test('trims the name and drops a client-sent image', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        const res = await signUp(h, {
            email: 'ada-image@example.com',
            name: '  Ada  ',
            image: 'https://evil.example/x.png',
        });
        expect(res.status).toBe(200);
        const row = h.db
            .select()
            .from(user)
            .where(eq(user.email, 'ada-image@example.com'))
            .get()!;
        expect(row.name).toBe('Ada');
        expect(row.image).toBeNull();
    });

    test('rejects a duplicate email and a blank name', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        expect((await signUp(h, { email: ADMIN_EMAIL })).status).toBe(422);
        const blank = await signUp(h, { name: '   ' });
        expect(blank.status).toBe(400);
        expect(((await blank.json()) as { code: string }).code).toBe(
            'INVALID_NAME'
        );
    });

    test.each([['invite_only'], [undefined]])(
        'is refused when registration mode is %p',
        async (mode) => {
            const h = await harness();
            setRegistrationMode(h.db, mode);
            const before = h.db.select({ n: count() }).from(user).get()!.n;
            const res = await signUp(h);
            expect(res.status).toBe(403);
            expect(((await res.json()) as { code: string }).code).toBe(
                'REGISTRATION_CLOSED'
            );
            expect(h.db.select({ n: count() }).from(user).get()!.n).toBe(
                before
            );
        }
    );
});

describe('log in', () => {
    test('the wizard admin logs in and gets a session', async () => {
        const h = await harness();
        const res = await signIn(h);
        expect(res.status).toBe(200);
        const cookie = cookieFrom(res);
        const body = await getSession(h, cookie);
        expect(body?.user.email).toBe(ADMIN_EMAIL);
        expect(body?.user.role).toBe('admin');
        expect(await getSession(h)).toBeNull();
    });

    test('a user with a Logto-style id keeps that id', async () => {
        const h = await harness();
        const now = new Date();
        h.db.insert(user)
            .values({
                id: 'k3x9q2m7p1z8',
                name: 'Logto User',
                email: 'logto@example.com',
                emailVerified: true,
                createdAt: now,
                updatedAt: now,
            })
            .run();
        h.db.insert(account)
            .values({
                id: crypto.randomUUID(),
                accountId: 'k3x9q2m7p1z8',
                providerId: 'credential',
                userId: 'k3x9q2m7p1z8',
                password: await hashPassword('logto-pass-1'),
                createdAt: now,
                updatedAt: now,
            })
            .run();
        const res = await signIn(h, {
            body: { email: 'logto@example.com', password: 'logto-pass-1' },
        });
        expect(res.status).toBe(200);
        expect((await getSession(h, cookieFrom(res)))?.user.id).toBe(
            'k3x9q2m7p1z8'
        );
    });

    test('a wrong password gets 401 and no session', async () => {
        const h = await harness();
        const res = await signIn(h, {
            body: { email: ADMIN_EMAIL, password: 'wrong-password' },
        });
        expect(res.status).toBe(401);
        expect(((await res.json()) as { code: string }).code).toBe(
            'INVALID_EMAIL_OR_PASSWORD'
        );
        expect(sessionCount(h.db)).toBe(0);
    });
});

describe('log out', () => {
    test('ends the session and expires the cookie', async () => {
        const h = await harness();
        const cookie = cookieFrom(await signIn(h));
        const res = await call(h, '/sign-out', { cookie });
        expect(res.status).toBe(200);
        expect(sessionCookie(res)).toContain('Max-Age=0');
        expect(sessionCount(h.db)).toBe(0);
        expect(await getSession(h, cookie)).toBeNull();
    });
});

describe('cross-origin requests', () => {
    test('are rejected by the API guard before a session is created', async () => {
        const h = await harness();
        const crossOrigin = await signIn(h, { headers: { Origin: EVIL } });
        expect(crossOrigin.status).toBe(403);
        expect(await crossOrigin.json()).toEqual({
            message: 'Cross-origin request blocked',
        });
        const plain = await signIn(h, {
            headers: { 'Content-Type': 'text/plain' },
        });
        expect(plain.status).toBe(415);
        expect(await plain.json()).toEqual({
            message: 'Content-Type must be application/json',
        });
        expect(sessionCount(h.db)).toBe(0);
    });

    test('cannot sign a user out', async () => {
        const h = await harness();
        const cookie = cookieFrom(await signIn(h));
        const res = await call(h, '/sign-out', {
            cookie,
            headers: { Origin: EVIL },
        });
        expect(res.status).toBe(403);
        expect(sessionCount(h.db)).toBe(1);
    });

    test('Better Auth still demands an Origin when a cookie is sent', async () => {
        const h = await harness();
        const cookie = cookieFrom(await signIn(h));
        const res = await call(h, '/sign-out', {
            cookie,
            headers: { Origin: undefined },
        });
        expect(res.status).toBe(403);
        expect(((await res.json()) as { code: string }).code).toBe(
            'MISSING_OR_NULL_ORIGIN'
        );
        expect(sessionCount(h.db)).toBe(1);
    });

    test('Origin: null from the same origin works behind a proxy', async () => {
        const h = await harness({ publicUrl: PROXIED_URL });
        const headers = { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' };
        const res = await signIn(h, { base: INTERNAL, headers });
        expect(res.status).toBe(200);
        const out = await call(h, '/sign-out', {
            base: INTERNAL,
            headers,
            cookie: cookieFrom(res),
        });
        expect(out.status).toBe(200);
    });
});

describe('rate limits', () => {
    test('the 11th sign-in from one IP within a minute gets 429', async () => {
        const h = await harness();
        const ip = nextTestIp();
        const wrong = { email: ADMIN_EMAIL, password: 'wrong-password' };
        for (let i = 0; i < 10; i++) {
            expect((await signIn(h, { ip, body: wrong })).status).toBe(401);
        }
        const limited = await signIn(h, { ip, body: wrong });
        expect(limited.status).toBe(429);
        expect(limited.headers.get('x-retry-after')).toBeTruthy();
        expect((await signIn(h, { body: wrong })).status).toBe(401);
    });

    test('the 6th sign-up from one IP within ten minutes gets 429', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        const ip = nextTestIp();
        for (let i = 0; i < 5; i++) {
            expect((await signUp(h, {}, { ip })).status).toBe(200);
        }
        expect((await signUp(h, {}, { ip })).status).toBe(429);
    });
});

describe('client IP', () => {
    const forwarded = (b: string) => ({
        'X-Forwarded-For': `198.51.100.7, ${b}`,
    });

    test('comes from X-Forwarded-For only when the proxy is trusted', async () => {
        const trusted = await harness({ trustProxy: true });
        const a = nextTestIp();
        const b = nextTestIp();
        await signIn(trusted, { ip: a, headers: forwarded(b) });
        expect(lastSessionIp(trusted.sqlite)).toBe(b);
        closeDatabase(trusted.sqlite);
        sqlite = undefined;
        rmSync(root!, { recursive: true, force: true });

        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const untrusted = await harness();
            await signIn(untrusted, { ip: a, headers: forwarded(b) });
            expect(lastSessionIp(untrusted.sqlite)).toBe(a);
        } finally {
            warn.mockRestore();
        }
    });

    test('ignores a client-sent internal IP header', async () => {
        const h = await harness();
        const a = nextTestIp();
        await signIn(h, {
            ip: a,
            headers: { 'x-quizaroni-client-ip': '192.0.2.99' },
        });
        expect(lastSessionIp(h.sqlite)).toBe(a);
    });

    test('survives a chunked body', async () => {
        const h = await harness();
        const a = nextTestIp();
        const body = new TextEncoder().encode(
            JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        );
        const res = await signIn(h, {
            ip: a,
            rawBody: new ReadableStream({
                start(controller) {
                    controller.enqueue(body);
                    controller.close();
                },
            }),
        });
        expect(res.status).toBe(200);
        expect(lastSessionIp(h.sqlite)).toBe(a);
    });

    test('warns once about X-Forwarded-For when the proxy is not trusted', async () => {
        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const h = await harness();
            await signIn(h, { headers: forwarded(nextTestIp()) });
            await signIn(h, { headers: forwarded(nextTestIp()) });
            const hints = warn.mock.calls.filter((args) =>
                String(args[0]).includes('QZ_TRUST_PROXY')
            );
            expect(hints).toHaveLength(1);
        } finally {
            warn.mockRestore();
        }
    });

    test('does not warn about X-Forwarded-For when the proxy is trusted', async () => {
        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const h = await harness({ trustProxy: true });
            await signIn(h, { headers: forwarded(nextTestIp()) });
            expect(
                warn.mock.calls.some((args) =>
                    String(args[0]).includes('QZ_TRUST_PROXY')
                )
            ).toBe(false);
        } finally {
            warn.mockRestore();
        }
    });
});

describe('cookies', () => {
    test('are Secure behind an HTTPS proxy reached over internal HTTP', async () => {
        const h = await harness({ publicUrl: PROXIED_URL });
        const res = await signIn(h, { base: INTERNAL });
        expect(res.status).toBe(200);
        const cookie = sessionCookie(res)!;
        expect(cookie).toStartWith('__Secure-quizaroni.session_token=');
        expect(cookie).toContain('Secure');
        expect((await getSession(h, cookieFrom(res), INTERNAL))?.user.email).toBe(
            ADMIN_EMAIL
        );
    });

    test('drop Secure on a plain-HTTP LAN only with the opt-in', async () => {
        const lan = 'http://192.168.1.10:8080';
        const optedIn = await harness({ publicUrl: lan, insecureCookies: true });
        const res = await signIn(optedIn, { base: lan });
        expect(res.status).toBe(200);
        const cookie = sessionCookie(res)!;
        expect(cookie).toStartWith('quizaroni.session_token=');
        expect(cookie).not.toContain('Secure');
        expect(
            (await getSession(optedIn, cookieFrom(res), lan))?.user.email
        ).toBe(ADMIN_EMAIL);
        closeDatabase(optedIn.sqlite);
        sqlite = undefined;
        rmSync(root!, { recursive: true, force: true });

        const strict = await harness({ publicUrl: lan });
        expect(sessionCookie(await signIn(strict, { base: lan }))).toContain(
            'Secure'
        );
    });
});

describe('routing', () => {
    test('only the allowlisted endpoints are reachable', async () => {
        const h = await harness();
        expect((await call(h, '/update-user', { body: {} })).status).toBe(404);
        expect((await call(h, '/ok', { method: 'GET' })).status).toBe(404);
    });

    test('rejects a body over 16 KB', async () => {
        const h = await harness();
        const res = await signIn(h, {
            body: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                pad: 'x'.repeat(17 * 1024),
            },
        });
        expect(res.status).toBe(413);
    });

    test('waits for setup to finish', async () => {
        const h = await harness({ setUp: false });
        expect((await signIn(h)).status).toBe(503);
    });
});

describe('errors', () => {
    test('a database failure is logged without the password or its hash', async () => {
        const h = await harness();
        setRegistrationMode(h.db, 'open');
        h.sqlite.run(
            "CREATE TRIGGER fail_account BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT, 'boom'); END"
        );
        const spies = [
            spyOn(console, 'error').mockImplementation(() => {}),
            spyOn(console, 'warn').mockImplementation(() => {}),
            spyOn(console, 'log').mockImplementation(() => {}),
        ];
        try {
            const res = await signUp(h, { password: 'leaky-password-9' });
            expect(res.status).toBe(500);
            expect(res.headers.get('content-type')).toContain(
                'application/json'
            );
            const logged = spies
                .flatMap((spy) => spy.mock.calls)
                .map((args) => args.map((a) => Bun.inspect(a)).join(' '))
                .join('\n');
            expect(logged).toContain('boom');
            expect(logged).not.toContain('$argon2id$');
            expect(logged).not.toContain('leaky-password-9');
            expect(logged).not.toContain('# SERVER_ERROR');
        } finally {
            for (const spy of spies) spy.mockRestore();
            h.sqlite.run('DROP TRIGGER fail_account');
        }
    });
});
