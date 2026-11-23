import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, eq } from 'drizzle-orm';
import { createApp } from '../app';
import { closeDatabase, type Db, openDatabase } from '../db';
import {
    account,
    instanceSettings,
    registrationInvite,
    session,
    user,
} from '../db/schema';
import { FileStore } from '../files/store';
import { createInvite } from '../invites/invites';
import { Mailer } from '../mail/mailer';
import { SETTING } from '../settings';
import { completeSetup, SetupGate } from '../setup/setup';
import { hashPassword } from './auth';
import {
    parseSocialConfig,
    type SocialConfig,
    socialProviderIds,
} from './social-config';
import { ipEnv, nextTestIp, testAuth } from './testing';
import { diskWebAssets } from '../web-assets';

const ADMIN_EMAIL = 'admin@example.com';
const PUBLIC_URL = 'https://quiz.example.org';
const GOOGLE_SUB = '104857600123456789012';
const GITHUB_ID = 87654321;
const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = ['s3cret', 'VALUE', 'xyz'].join('-');

const BOTH: SocialConfig = parseSocialConfig({
    QZ_GOOGLE_CLIENT_ID: CLIENT_ID,
    QZ_GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
    QZ_GITHUB_CLIENT_ID: CLIENT_ID,
    QZ_GITHUB_CLIENT_SECRET: CLIENT_SECRET,
});
const GOOGLE_ONLY: SocialConfig = { google: BOTH.google };

type Harness = {
    app: ReturnType<typeof createApp>;
    db: Db;
    sqlite: Database;
    adminId: string;
};

let root: string | undefined;
let sqlite: Database | undefined;
const spies: { mockRestore: () => void }[] = [];

async function harness(
    o: { social?: SocialConfig; open?: boolean; setUp?: boolean } = {}
): Promise<Harness> {
    root = mkdtempSync(join(tmpdir(), 'qz-social-'));
    const webDir = join(root, 'web');
    mkdirSync(webDir, { recursive: true });
    writeFileSync(join(webDir, 'index.html'), '<!doctype html>');
    // Better Auth logs every failed sign-in at error level.
    spies.push(
        spyOn(console, 'error').mockImplementation(() => {}),
        spyOn(console, 'warn').mockImplementation(() => {})
    );
    const opened = openDatabase(join(root, 'data'));
    sqlite = opened.sqlite;
    const setUp = o.setUp ?? true;
    if (setUp) {
        completeSetup(opened.db, {
            name: 'Admin',
            email: ADMIN_EMAIL,
            passwordHash: await hashPassword('correct-horse-1'),
            registrationMode: o.open ? 'open' : 'invite_only',
            teacherPolicy: 'admin_approved',
            publicUrl: undefined,
        });
    }
    const social = o.social ?? {};
    const app = createApp({
        sqlite: opened.sqlite,
        db: opened.db,
        files: new FileStore(join(root, 'data')),
        web: diskWebAssets(webDir),
        version: '0.0.0-test',
        setup: new SetupGate(opened.db, setUp ? undefined : 'token'),
        auth: testAuth(opened.db, { publicUrl: PUBLIC_URL, social }),
        trustProxy: false,
        mailer: new Mailer(opened.db, undefined),
        social: socialProviderIds(social),
    });
    const admin = opened.db.select().from(user).get();
    return {
        app,
        db: opened.db,
        sqlite: opened.sqlite,
        adminId: admin?.id ?? '',
    };
}

afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function setRegistrationMode(db: Db, mode: 'open' | 'invite_only'): void {
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
    rawBody?: string;
    headers?: Record<string, string | undefined>;
    cookie?: string;
    ip?: string;
};

function call(
    h: Harness,
    path: string,
    o: CallOptions = {}
): Promise<Response> {
    const headers: Record<string, string> = {
        Origin: PUBLIC_URL,
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
    return Promise.resolve(
        h.app.request(
            `${PUBLIC_URL}/api/auth${path}`,
            init,
            ipEnv(o.ip ?? nextTestIp())
        )
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

function jwt(claims: Record<string, unknown>): string {
    const part = (o: unknown) =>
        Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.sig`;
}

type GitHubStub = {
    profile?: Record<string, unknown>;
    emails?: { email: string; primary: boolean; verified: boolean }[];
};

type Stub = { calls: { url: string; body: string }[] };

// Better Auth reads Google's identity from the id_token in the token response
// without verifying it, so an unsigned one is enough.
function stubProviders(o: {
    google?: Record<string, unknown>;
    github?: GitHubStub;
}): Stub {
    const stub: Stub = { calls: [] };
    const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
            headers: { 'content-type': 'application/json' },
        });
    const spy = spyOn(globalThis, 'fetch').mockImplementation((async (
        input: string | URL | Request,
        init?: RequestInit
    ) => {
        const url =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url;
        stub.calls.push({ url, body: String(init?.body ?? '') });
        if (url === 'https://oauth2.googleapis.com/token' && o.google) {
            return json({
                access_token: 'google-access-token',
                refresh_token: 'google-refresh-token',
                expires_in: 3600,
                token_type: 'Bearer',
                scope: 'openid email profile',
                id_token: jwt({ sub: GOOGLE_SUB, ...o.google }),
            });
        }
        if (url === 'https://github.com/login/oauth/access_token' && o.github) {
            return json({
                access_token: 'gho_access_token',
                token_type: 'bearer',
                scope: 'read:user,user:email',
            });
        }
        if (url === 'https://api.github.com/user' && o.github) {
            return json({
                id: GITHUB_ID,
                login: 'octocat',
                name: null,
                email: null,
                avatar_url: 'https://avatars.example/u/1',
                ...o.github.profile,
            });
        }
        if (url === 'https://api.github.com/user/emails' && o.github) {
            return json(o.github.emails ?? []);
        }
        throw new Error(`Unexpected outbound request to ${url}`);
    }) as unknown as typeof fetch);
    spies.push(spy);
    return stub;
}

type Started = { url: URL; state: string; cookie: string };

async function startSignIn(
    h: Harness,
    provider: 'google' | 'github',
    body: Record<string, unknown> = {}
): Promise<Started> {
    const res = await call(h, '/sign-in/social', {
        body: {
            provider,
            callbackURL: '/',
            errorCallbackURL: '/login',
            disableRedirect: true,
            ...body,
        },
    });
    expect(res.status).toBe(200);
    const url = new URL(((await res.json()) as { url: string }).url);
    return {
        url,
        state: url.searchParams.get('state')!,
        cookie: cookieFrom(res),
    };
}

function callback(
    h: Harness,
    provider: 'google' | 'github',
    started: Started,
    query: Record<string, string> = { code: 'auth-code' }
): Promise<Response> {
    const params = new URLSearchParams({ state: started.state, ...query });
    return call(h, `/callback/${provider}?${params}`, {
        method: 'GET',
        cookie: started.cookie,
    });
}

function redirectOf(res: Response): URL {
    expect(res.status).toBe(302);
    return new URL(res.headers.get('location')!, PUBLIC_URL);
}

function errorOf(res: Response): string | null {
    return redirectOf(res).searchParams.get('error');
}

function rowCount(
    h: Harness,
    table: typeof user | typeof account | typeof session
) {
    return h.db.select({ n: count() }).from(table).get()!.n;
}

function seedUser(
    h: Harness,
    o: {
        email: string;
        emailVerified: boolean;
        link?: { providerId: string; accountId: string };
    }
): string {
    const id = crypto.randomUUID();
    const now = new Date();
    h.db
        .insert(user)
        .values({
            id,
            name: 'Seeded',
            email: o.email,
            emailVerified: o.emailVerified,
            image: null,
            role: 'user',
            createdAt: now,
            updatedAt: now,
        })
        .run();
    if (o.link) {
        h.db
            .insert(account)
            .values({
                id: crypto.randomUUID(),
                accountId: o.link.accountId,
                providerId: o.link.providerId,
                userId: id,
                createdAt: now,
                updatedAt: now,
            })
            .run();
    }
    return id;
}

function accountsOf(h: Harness, userId: string) {
    return h.db.select().from(account).where(eq(account.userId, userId)).all();
}

function expectNoTokens(row: typeof account.$inferSelect): void {
    expect(row.accessToken).toBeNull();
    expect(row.refreshToken).toBeNull();
    expect(row.idToken).toBeNull();
    expect(row.accessTokenExpiresAt).toBeNull();
    expect(row.refreshTokenExpiresAt).toBeNull();
}

const googleProfile = (email: string, extra: Record<string, unknown> = {}) => ({
    email,
    email_verified: true,
    name: 'Grace Hopper',
    picture: 'https://lh3.example/photo.jpg',
    ...extra,
});

describe('routing', () => {
    test('with no provider configured the social endpoints are 404', async () => {
        const h = await harness();
        expect(
            (await call(h, '/sign-in/social', { body: { provider: 'google' } }))
                .status
        ).toBe(404);
        expect(
            (
                await call(h, '/callback/google?code=x&state=y', {
                    method: 'GET',
                })
            ).status
        ).toBe(404);
        expect(
            (
                await call(h, '/callback/github?code=x&state=y', {
                    method: 'GET',
                })
            ).status
        ).toBe(404);
    });

    test('a provider that is not configured is 404, and the callback is GET only', async () => {
        const h = await harness({ social: GOOGLE_ONLY });
        expect(
            (
                await call(h, '/callback/github?code=x&state=y', {
                    method: 'GET',
                })
            ).status
        ).toBe(404);
        expect(
            (
                await call(h, '/callback/google', {
                    body: { code: 'x', state: 'y' },
                })
            ).status
        ).toBe(404);
        const res = await call(h, '/sign-in/social', {
            body: { provider: 'github', callbackURL: '/' },
        });
        expect(res.status).toBe(404);
    });

    test('the providers endpoint lists none by default and is never cached', async () => {
        const h = await harness();
        const res = await call(h, '/providers', { method: 'GET' });
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(await res.json()).toEqual({
            providers: [],
            registrationOpen: false,
        });
    });

    test('the providers endpoint lists the configured providers and follows the registration mode', async () => {
        const h = await harness({ social: BOTH });
        const closed = await call(h, '/providers', { method: 'GET' });
        expect(await closed.json()).toEqual({
            providers: ['google', 'github'],
            registrationOpen: false,
        });
        setRegistrationMode(h.db, 'open');
        const open = await call(h, '/providers', { method: 'GET' });
        expect(await open.json()).toEqual({
            providers: ['google', 'github'],
            registrationOpen: true,
        });
    });

    test('the providers endpoint waits for setup and never exposes secrets', async () => {
        const waiting = await harness({ social: BOTH, setUp: false });
        expect(
            (await call(waiting, '/providers', { method: 'GET' })).status
        ).toBe(503);
    });

    test('the providers response carries no client id or secret', async () => {
        const h = await harness({ social: BOTH });
        const text = await (
            await call(h, '/providers', { method: 'GET' })
        ).text();
        expect(text).not.toContain(CLIENT_ID);
        expect(text).not.toContain(CLIENT_SECRET);
    });

    test('other Better Auth endpoints stay unreachable with providers on', async () => {
        const h = await harness({ social: BOTH });
        expect((await call(h, '/link-social', { body: {} })).status).toBe(404);
        expect(
            (await call(h, '/list-accounts', { method: 'GET' })).status
        ).toBe(404);
        expect((await call(h, '/unlink-account', { body: {} })).status).toBe(
            404
        );
    });
});

describe('POST /sign-in/social', () => {
    test('returns the Google authorization URL with our redirect URI and sets the state cookie', async () => {
        const h = await harness({ social: BOTH });
        const res = await call(h, '/sign-in/social', {
            body: {
                provider: 'google',
                callbackURL: '/',
                errorCallbackURL: '/login',
                disableRedirect: true,
            },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { url: string; redirect: boolean };
        expect(body.redirect).toBe(false);
        const url = new URL(body.url);
        expect(url.origin + url.pathname).toBe(
            'https://accounts.google.com/o/oauth2/v2/auth'
        );
        expect(url.searchParams.get('redirect_uri')).toBe(
            `${PUBLIC_URL}/api/auth/callback/google`
        );
        expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
        expect(url.searchParams.get('prompt')).toBe('select_account');
        expect(url.searchParams.get('state')).toBeTruthy();
        expect(url.searchParams.get('code_challenge')).toBeTruthy();
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.toString()).not.toContain(CLIENT_SECRET);
        expect(
            res.headers.getSetCookie().some((c) => c.includes('state'))
        ).toBe(true);
    });

    test('returns the GitHub authorization URL', async () => {
        const h = await harness({ social: BOTH });
        const { url } = await startSignIn(h, 'github');
        expect(url.origin + url.pathname).toBe(
            'https://github.com/login/oauth/authorize'
        );
        expect(url.searchParams.get('redirect_uri')).toBe(
            `${PUBLIC_URL}/api/auth/callback/github`
        );
    });

    test('refuses a cross-origin request', async () => {
        const h = await harness({ social: BOTH });
        const res = await call(h, '/sign-in/social', {
            body: { provider: 'google', callbackURL: '/' },
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
    });

    test('refuses a request that is not JSON', async () => {
        const h = await harness({ social: BOTH });
        const res = await call(h, '/sign-in/social', {
            rawBody: 'provider=google&callbackURL=%2F',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        expect(res.status).toBe(415);
    });

    test('refuses callback URLs on another origin', async () => {
        const h = await harness({ social: BOTH });
        for (const field of [
            'callbackURL',
            'errorCallbackURL',
            'newUserCallbackURL',
        ]) {
            const res = await call(h, '/sign-in/social', {
                body: {
                    provider: 'google',
                    callbackURL: '/',
                    [field]: 'https://evil.example/steal',
                },
            });
            expect(res.status).toBe(403);
        }
    });

    test('refuses body fields that widen the sign-in', async () => {
        const h = await harness({ social: BOTH });
        const fields: Record<string, unknown> = {
            idToken: { token: 'x' },
            scopes: ['https://www.googleapis.com/auth/drive'],
            additionalParams: { login_hint: 'a@b.c' },
            additionalData: { callbackURL: 'https://evil.example' },
            loginHint: 'someone@example.com',
        };
        for (const [name, value] of Object.entries(fields)) {
            const res = await call(h, '/sign-in/social', {
                body: { provider: 'google', callbackURL: '/', [name]: value },
            });
            expect(res.status).toBe(400);
            expect(((await res.json()) as { code: string }).code).toBe(
                'INVALID_SOCIAL_REQUEST'
            );
        }
    });

    test('is rate limited to 10 requests a minute per client', async () => {
        const h = await harness({ social: BOTH });
        const ip = nextTestIp();
        const send = () =>
            call(h, '/sign-in/social', {
                body: { provider: 'google', callbackURL: '/' },
                ip,
            });
        for (let i = 0; i < 10; i++) expect((await send()).status).toBe(200);
        expect((await send()).status).toBe(429);
    });
});

describe('GET /callback', () => {
    test('signs an imported Google account in without creating rows or storing tokens', async () => {
        const h = await harness({ social: BOTH });
        const id = seedUser(h, {
            email: 'grace@example.com',
            emailVerified: true,
            link: { providerId: 'google', accountId: GOOGLE_SUB },
        });
        const users = rowCount(h, user);
        const accounts = rowCount(h, account);
        const stub = stubProviders({
            google: googleProfile('grace@example.com'),
        });

        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).pathname).toBe('/');
        expect(redirectOf(res).searchParams.get('error')).toBeNull();
        const cookie = sessionCookie(res)!;
        expect(cookie).toContain('quizaroni.session_token=');
        expect(rowCount(h, user)).toBe(users);
        expect(rowCount(h, account)).toBe(accounts);
        expect(rowCount(h, session)).toBe(1);
        const [row] = accountsOf(h, id);
        expectNoTokens(row!);
        const exchange = stub.calls.find((c) => c.url.endsWith('/token'))!;
        expect(new URLSearchParams(exchange.body).get('redirect_uri')).toBe(
            `${PUBLIC_URL}/api/auth/callback/google`
        );

        const me = await call(h, '/get-session', {
            method: 'GET',
            cookie: cookieFrom(res),
        });
        expect(((await me.json()) as { user: { id: string } }).user.id).toBe(
            id
        );
    });

    test('matches an imported GitHub account by id, including when the email is private', async () => {
        const h = await harness({ social: BOTH });
        const id = seedUser(h, {
            email: 'octo@example.com',
            emailVerified: true,
            link: { providerId: 'github', accountId: String(GITHUB_ID) },
        });
        const users = rowCount(h, user);
        const accounts = rowCount(h, account);
        stubProviders({
            github: {
                emails: [
                    {
                        email: 'octo@example.com',
                        primary: true,
                        verified: true,
                    },
                ],
            },
        });

        const started = await startSignIn(h, 'github');
        const res = await callback(h, 'github', started);

        expect(redirectOf(res).searchParams.get('error')).toBeNull();
        expect(sessionCookie(res)).toBeTruthy();
        expect(rowCount(h, user)).toBe(users);
        expect(rowCount(h, account)).toBe(accounts);
        expectNoTokens(accountsOf(h, id)[0]!);
    });

    test('links a verified local user on a verified provider email, keeping no tokens', async () => {
        const h = await harness({ social: BOTH });
        const id = seedUser(h, {
            email: 'grace@example.com',
            emailVerified: true,
        });
        const users = rowCount(h, user);
        stubProviders({ google: googleProfile('grace@example.com') });

        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).searchParams.get('error')).toBeNull();
        expect(sessionCookie(res)).toBeTruthy();
        expect(rowCount(h, user)).toBe(users);
        const rows = accountsOf(h, id);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.providerId).toBe('google');
        expect(rows[0]!.accountId).toBe(GOOGLE_SUB);
        expectNoTokens(rows[0]!);
        const profile = h.db.select().from(user).where(eq(user.id, id)).get()!;
        expect(profile.name).toBe('Seeded');
        expect(profile.image).toBeNull();
    });

    test('does not link into an email sign-up that was never verified', async () => {
        const h = await harness({ social: BOTH });
        const id = seedUser(h, {
            email: 'grace@example.com',
            emailVerified: false,
        });
        const accounts = rowCount(h, account);
        stubProviders({ google: googleProfile('grace@example.com') });

        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toBe('account_not_linked');
        expect(sessionCookie(res)).toBeUndefined();
        expect(rowCount(h, account)).toBe(accounts);
        expect(accountsOf(h, id)).toHaveLength(0);
    });

    test('creates a new user on request when registration is open', async () => {
        const h = await harness({ social: BOTH, open: true });
        const users = rowCount(h, user);
        stubProviders({
            google: {
                email: 'new.person@example.com',
                email_verified: true,
                picture: 'https://lh3.example/photo.jpg',
            },
        });

        const started = await startSignIn(h, 'google', {
            requestSignUp: true,
            errorCallbackURL: '/signUp',
        });
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).searchParams.get('error')).toBeNull();
        expect(sessionCookie(res)).toBeTruthy();
        expect(rowCount(h, user)).toBe(users + 1);
        const created = h.db
            .select()
            .from(user)
            .where(eq(user.email, 'new.person@example.com'))
            .get()!;
        expect(created.image).toBeNull();
        expect(created.name).toBe('new.person');
        expect(created.emailVerified).toBe(true);
        expect(created.role).toBe('user');
        const rows = accountsOf(h, created.id);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.providerId).toBe('google');
        expectNoTokens(rows[0]!);
    });

    test('cleans the provider name of control characters', async () => {
        const h = await harness({ social: BOTH, open: true });
        stubProviders({
            google: googleProfile('ada@example.com', {
                name: '  Ada\u0007 Love\u0000lace  ',
            }),
        });
        const started = await startSignIn(h, 'google', { requestSignUp: true });
        await callback(h, 'google', started);
        const created = h.db
            .select()
            .from(user)
            .where(eq(user.email, 'ada@example.com'))
            .get()!;
        expect(created.name).toBe('Ada Lovelace');
    });

    test('without requestSignUp an unknown identity is refused', async () => {
        const h = await harness({ social: BOTH, open: true });
        const users = rowCount(h, user);
        stubProviders({ google: googleProfile('stranger@example.com') });

        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toBe('signup_disabled');
        expect(rowCount(h, user)).toBe(users);
        expect(sessionCookie(res)).toBeUndefined();
    });

    test('an invite-only server creates no user and leaves invites alone', async () => {
        const h = await harness({ social: BOTH });
        const { invite } = createInvite(h.db, { createdBy: h.adminId });
        const users = rowCount(h, user);
        stubProviders({ google: googleProfile('stranger@example.com') });

        const started = await startSignIn(h, 'google', {
            requestSignUp: true,
            errorCallbackURL: '/signUp',
        });
        const res = await callback(h, 'google', started);

        expect(redirectOf(res).pathname).toBe('/signUp');
        expect(errorOf(res)).toBe('REGISTRATION_CLOSED');
        expect(rowCount(h, user)).toBe(users);
        const row = h.db
            .select()
            .from(registrationInvite)
            .where(eq(registrationInvite.id, invite.id))
            .get()!;
        expect(row.uses).toBe(0);
    });

    test('a provider email that is not verified cannot create a user', async () => {
        const h = await harness({ social: BOTH, open: true });
        const users = rowCount(h, user);
        stubProviders({
            google: googleProfile('new@example.com', { email_verified: false }),
        });

        const started = await startSignIn(h, 'google', { requestSignUp: true });
        const res = await callback(h, 'google', started);

        expect(errorOf(res)).toBe('SOCIAL_EMAIL_UNVERIFIED');
        expect(rowCount(h, user)).toBe(users);
    });

    test('an unverified GitHub email cannot create a user either', async () => {
        const h = await harness({ social: BOTH, open: true });
        const users = rowCount(h, user);
        stubProviders({
            github: {
                emails: [
                    {
                        email: 'new@example.com',
                        primary: true,
                        verified: false,
                    },
                ],
            },
        });

        const started = await startSignIn(h, 'github', { requestSignUp: true });
        const res = await callback(h, 'github', started);

        expect(errorOf(res)).toBe('SOCIAL_EMAIL_UNVERIFIED');
        expect(rowCount(h, user)).toBe(users);
    });

    test('a callback without the state cookie goes to the login page', async () => {
        const h = await harness({ social: BOTH });
        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', { ...started, cookie: '' });
        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toStartWith('state_');
    });

    test('a callback without state goes to the login page', async () => {
        const h = await harness({ social: BOTH });
        const res = await call(h, '/callback/google?code=abc', {
            method: 'GET',
        });
        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toBe('state_not_found');
    });

    test('passes the provider error through when the user cancels', async () => {
        const h = await harness({ social: BOTH });
        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started, {
            error: 'access_denied',
        });
        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toBe('access_denied');
        expect(sessionCookie(res)).toBeUndefined();
    });

    test('a replayed callback does not sign in twice', async () => {
        const h = await harness({ social: BOTH });
        seedUser(h, {
            email: 'grace@example.com',
            emailVerified: true,
            link: { providerId: 'google', accountId: GOOGLE_SUB },
        });
        stubProviders({ google: googleProfile('grace@example.com') });
        const started = await startSignIn(h, 'google');
        expect(
            sessionCookie(await callback(h, 'google', started))
        ).toBeTruthy();
        const replay = await callback(h, 'google', started);
        expect(sessionCookie(replay)).toBeUndefined();
        expect(errorOf(replay)).toBeTruthy();
        expect(rowCount(h, session)).toBe(1);
    });

    test('a failed token exchange lands on the login page', async () => {
        const h = await harness({ social: BOTH });
        const failing = spyOn(globalThis, 'fetch').mockImplementation(
            (async () =>
                new Response('{"error":"invalid_grant"}', {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                })) as unknown as typeof fetch
        );
        spies.push(failing);
        const started = await startSignIn(h, 'google');
        const res = await callback(h, 'google', started);
        expect(redirectOf(res).pathname).toBe('/login');
        expect(errorOf(res)).toBeTruthy();
        expect(sessionCookie(res)).toBeUndefined();
    });

    test('is rate limited to 30 requests a minute per client', async () => {
        const h = await harness({ social: BOTH });
        const ip = nextTestIp();
        const send = () =>
            call(h, '/callback/google?code=abc', { method: 'GET', ip });
        for (let i = 0; i < 30; i++) expect((await send()).status).toBe(302);
        expect((await send()).status).toBe(429);
    });
});
