import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { session, userProfile } from '../db/schema';
import {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    apiRequest as request,
    type CallOptions,
    cookieFrom,
    createRouteHarness,
    type RouteHarness as Harness,
    signUp,
} from '../testing/route-harness';
import { emptyGamification } from './metadata';

const USER_PATHS = [
    '/get-user',
    '/update-metadata',
    '/update-username',
    '/update-gamification',
    '/update-notification-preferences',
    '/download-user-data',
] as const;

let current: Harness | undefined;

async function harness(): Promise<Harness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const post = (h: Harness, path: string, o: CallOptions = {}) =>
    request(h, `/api/users${path}`, o);

let lastEmail = '';
async function signUpUser(h: Harness): Promise<string> {
    const { cookie, email } = await signUp(h);
    lastEmail = email;
    return cookie;
}

type UserBody = {
    userUUID: string;
    email: string;
    username: string | null;
    metadata: Record<string, unknown>;
};

async function getUser(h: Harness, cookie: string): Promise<UserBody> {
    const res = await post(h, '/get-user', { cookie });
    expect(res.status).toBe(200);
    return ((await res.json()) as { user: UserBody }).user;
}

describe('authentication', () => {
    test.each(USER_PATHS)('%s needs a session', async (path) => {
        const h = await harness();
        for (const cookie of [undefined, '__Secure-quizaroni.session_token=junk']) {
            const res = await post(h, path, { cookie });
            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ message: 'Unauthorized' });
        }
    });

    test('a cross-origin write is blocked and writes nothing', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const before = await getUser(h, cookie);
        const res = await post(h, '/update-metadata', {
            cookie,
            body: { updates: { defaultTheme: 'light' } },
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({
            message: 'Cross-origin request blocked',
        });
        expect((await getUser(h, cookie)).metadata).toEqual(before.metadata);
    });
});

describe('get-user', () => {
    test('returns defaults for a fresh sign-up', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const res = await post(h, '/get-user', { cookie });
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const body = (await res.json()) as {
            message: string;
            user: UserBody;
        };
        const sessionUserId = h.db.select().from(session).get()!.userId;
        expect(body.message).toBe('Successfully retrieved user data');
        expect(body.user).toMatchObject({
            userUUID: sessionUserId,
            username: null,
            labels: [],
            metadata: { defaultTheme: 'dark', homeView: 'table' },
        });
    });

    test('works for the setup wizard admin', async () => {
        const h = await harness();
        const res = await request(h, '/api/auth/sign-in/email', {
            body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });
        expect(res.status).toBe(200);
        const user = await getUser(h, cookieFrom(res));
        expect(user).toMatchObject({ email: ADMIN_EMAIL, username: null });
    });

    test('users only see their own profile', async () => {
        const h = await harness();
        const a = await signUpUser(h);
        const b = await signUpUser(h);
        await post(h, '/update-metadata', {
            cookie: a,
            body: { updates: { defaultTheme: 'light' } },
        });
        expect((await getUser(h, a)).metadata.defaultTheme).toBe('light');
        expect((await getUser(h, b)).metadata.defaultTheme).toBe('dark');
    });
});

describe('update-metadata', () => {
    test('saves allowlisted keys and ignores server-managed ones', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const res = await post(h, '/update-metadata', {
            cookie,
            body: {
                updates: {
                    homeView: 'grid',
                    gamification: { currentStreak: 99 },
                },
            },
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            message: 'Successfully updated user metadata',
            user: { metadata: { homeView: 'grid' } },
        });
        const user = await getUser(h, cookie);
        expect(user.metadata.homeView).toBe('grid');
        expect(user.metadata.gamification).toBeUndefined();
    });

    test('rejects bad input', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const cases: [CallOptions, number, string][] = [
            [{ body: { updates: [] } }, 400, 'Invalid updates'],
            [{ rawBody: '{not json' }, 400, 'Invalid JSON'],
            [
                { body: { updates: { homeView: 'x'.repeat(130 * 1024) } } },
                413,
                'Updates too large',
            ],
            [
                { rawBody: JSON.stringify({ x: 'x'.repeat(300 * 1024) }) },
                413,
                'Payload too large',
            ],
        ];
        for (const [o, status, message] of cases) {
            const res = await post(h, '/update-metadata', { cookie, ...o });
            expect(res.status).toBe(status);
            expect(await res.json()).toEqual({ message });
        }
    });
});

describe('non-object bodies', () => {
    test.each([
        '/update-metadata',
        '/update-username',
        '/update-notification-preferences',
        '/update-gamification',
    ])('%s answers 400 for null and [] bodies', async (path) => {
        const h = await harness();
        const cookie = await signUpUser(h);
        for (const rawBody of ['null', '[]']) {
            const res = await post(h, path, { cookie, rawBody });
            expect(res.status).toBe(400);
        }
    });
});

describe('update-username', () => {
    test('saves a trimmed name, even as the first call', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const res = await post(h, '/update-username', {
            cookie,
            body: { username: '  ada_l  ' },
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            message: 'Successfully updated username',
            user: { username: 'ada_l' },
            studysetsUpdated: 0,
            studysetsFailed: 0,
            studysetsRenameComplete: true,
        });
        expect((await getUser(h, cookie)).username).toBe('ada_l');
    });

    test.each(['ab', '1abc', 'has space', 42])(
        'rejects %p',
        async (username) => {
            const h = await harness();
            const cookie = await signUpUser(h);
            const res = await post(h, '/update-username', {
                cookie,
                body: { username },
            });
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ message: 'Invalid username' });
        }
    );

    test('409s for a name another user holds in any case', async () => {
        const h = await harness();
        const a = await signUpUser(h);
        const b = await signUpUser(h);
        await post(h, '/update-username', {
            cookie: a,
            body: { username: 'alice' },
        });
        const res = await post(h, '/update-username', {
            cookie: b,
            body: { username: 'ALICE' },
        });
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ message: 'Username taken' });
        expect((await getUser(h, a)).username).toBe('alice');
        expect((await getUser(h, b)).username).toBeNull();
    });

    test('renames the caller, never a user named in the body', async () => {
        const h = await harness();
        const a = await signUpUser(h);
        const b = await signUpUser(h);
        const bUser = await getUser(h, b);
        await post(h, '/update-username', {
            cookie: a,
            body: { username: 'ada', userUUID: bUser.userUUID },
        });
        expect((await getUser(h, a)).username).toBe('ada');
        expect((await getUser(h, b)).username).toBeNull();
        const rows = h.db
            .select()
            .from(userProfile)
            .where(eq(userProfile.userId, bUser.userUUID))
            .all();
        expect(rows[0]?.username).toBeNull();
    });
});

describe('update-gamification', () => {
    const push = (cookie: string, longestStreak: number) => ({
        cookie,
        body: {
            gamification: { ...emptyGamification(), longestStreak },
            customAchievements: [],
        },
    });

    test('merges with an earlier push', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        await post(h, '/update-gamification', push(cookie, 8));
        const res = await post(h, '/update-gamification', push(cookie, 3));
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            message: 'Successfully updated gamification',
            gamification: { longestStreak: 8 },
            customAchievements: [],
            user: { metadata: { gamification: { longestStreak: 8 } } },
        });
    });

    test('rejects a missing or malformed body', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const badMetric = {
            gamification: emptyGamification(),
            customAchievements: [
                {
                    id: 'x',
                    title: 'T',
                    description: 'D',
                    icon: 'star',
                    metric: 'bogus',
                    threshold: 1,
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
        };
        for (const body of [{}, badMetric]) {
            const res = await post(h, '/update-gamification', {
                cookie,
                body,
            });
            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                message: 'Invalid gamification',
            });
        }
    });
});

describe('update-notification-preferences', () => {
    test('deep-merges', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        await post(h, '/update-notification-preferences', {
            cookie,
            body: { updates: { email: { enabled: false, digest: true } } },
        });
        const res = await post(h, '/update-notification-preferences', {
            cookie,
            body: { updates: { email: { enabled: true } } },
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            message: 'Successfully updated notification preferences',
            user: {
                metadata: {
                    notifications: { email: { enabled: true, digest: true } },
                },
            },
        });
    });

    test('rejects a string', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const res = await post(h, '/update-notification-preferences', {
            cookie,
            body: { updates: 'on' },
        });
        expect(res.status).toBe(400);
    });
});

describe('download-user-data', () => {
    test('returns the profile as an attachment with no secrets', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        await post(h, '/update-metadata', {
            cookie,
            body: { updates: { homeView: 'grid' } },
        });
        const res = await post(h, '/download-user-data', {
            cookie,
            body: { includeStudysets: true },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Disposition')).toMatch(
            /^attachment; filename="quizaroni-data-\d{4}-\d{2}-\d{2}\.json"$/
        );
        const text = await res.text();
        const body = JSON.parse(text);
        expect(body).toMatchObject({
            format: 'quizaroni-user-data',
            version: 1,
            user: {
                email: lastEmail,
                metadata: { homeView: 'grid' },
            },
        });
        const token = h.db.select().from(session).get()!.token;
        expect(text).not.toContain('$argon2');
        expect(text).not.toContain(token);
    });
});

describe('with study sets', () => {
    const createSet = async (h: Harness, cookie: string) => {
        const res = await request(h, '/api/studysets/create-studyset', {
            cookie,
        });
        expect(res.status).toBe(200);
        return ((await res.json()) as { studyset: { studysetUUID: string } })
            .studyset.studysetUUID;
    };

    test('a new username becomes the author of the sets of the caller', async () => {
        const h = await harness();
        const cookie = await signUpUser(h);
        const id = await createSet(h, cookie);
        const res = await post(h, '/update-username', {
            cookie,
            body: { username: 'ada_l' },
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            studysetsUpdated: 1,
            studysetsFailed: 0,
            studysetsRenameComplete: true,
        });
        const got = await request(h, '/api/studysets/get-studyset', {
            cookie,
            body: { studysetUUID: id },
        });
        expect(
            ((await got.json()) as { studyset: { username: string } })
                .studyset.username
        ).toBe('ada_l');
    });

    test('download-user-data includes only the sets of the caller when asked', async () => {
        const h = await harness();
        const a = await signUpUser(h);
        const b = await signUpUser(h);
        const own = await createSet(h, a);
        await createSet(h, b);

        const withSets = await post(h, '/download-user-data', {
            cookie: a,
            body: { includeStudysets: true },
        });
        expect(withSets.status).toBe(200);
        const exported = (await withSets.json()) as {
            studysets: { studysetUUID: string }[];
        };
        expect(exported.studysets.map((s) => s.studysetUUID)).toEqual([own]);

        const without = await post(h, '/download-user-data', {
            cookie: a,
            body: {},
        });
        expect(await without.json()).not.toHaveProperty('studysets');
    });
});
