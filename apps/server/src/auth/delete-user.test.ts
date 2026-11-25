import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { account, session, studyset, user, userProfile } from '../db/schema';
import { PNG_BYTES, uploadCardFile } from '../testing/files';
import {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    apiGet,
    apiRequest,
    cookieFrom,
    createRouteHarness,
    type RouteHarness,
    signIn,
    signUp,
} from '../testing/route-harness';
import { createSet, getSet, okJson, studysetPost } from '../testing/studysets';
import { RATE_LIMITS, RECENT_SIGN_IN_SECONDS } from './auth';
import { ipEnv, nextTestIp } from './testing';

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const DELETE_PATH = '/api/auth/delete-user';

const deleteUser = (
    h: RouteHarness,
    cookie: string | undefined,
    body: unknown,
    env?: Record<string, unknown>
) => apiRequest(h, DELETE_PATH, { cookie, body, env });

const userId = (h: RouteHarness, email: string) =>
    h.db.select().from(user).where(eq(user.email, email)).get()?.id;

const userExists = (h: RouteHarness, email: string) =>
    userId(h, email) !== undefined;

async function errorOf(res: Response) {
    return (await res.json()) as { code?: string; message?: string };
}

async function sessionOf(h: RouteHarness, cookie: string) {
    const res = await apiGet(h, '/api/auth/get-session', { cookie });
    return (await res.json()) as { user?: { email: string } } | null;
}

function makePasswordless(h: RouteHarness, id: string) {
    h.db
        .update(account)
        .set({ providerId: 'google', password: null })
        .where(eq(account.userId, id))
        .run();
}

describe('POST /api/auth/delete-user', () => {
    test('deletes the account and all its data, and ends every session', async () => {
        const h = await harness();
        const { cookie, email, password } = await signUp(h);
        const otherDevice = await signIn(h, email, password);
        const id = userId(h, email)!;
        const set = await createSet(h, cookie);

        const res = await deleteUser(h, cookie, { password });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ success: true });
        expect(res.headers.getSetCookie().join('\n')).toContain('Max-Age=0');

        expect(userExists(h, email)).toBe(false);
        expect(
            h.db.select().from(account).where(eq(account.userId, id)).all()
        ).toEqual([]);
        expect(
            h.db.select().from(session).where(eq(session.userId, id)).all()
        ).toEqual([]);
        expect(
            h.db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, id))
                .all()
        ).toEqual([]);
        expect(
            h.db
                .select()
                .from(studyset)
                .where(eq(studyset.studysetUUID, set.studysetUUID))
                .all()
        ).toEqual([]);

        expect(await sessionOf(h, cookie)).toBeNull();
        expect(await sessionOf(h, otherDevice)).toBeNull();
        const again = await apiRequest(h, '/api/auth/sign-in/email', {
            body: { email, password },
        });
        expect(again.status).not.toBe(200);
    });

    test('a wrong password deletes nothing', async () => {
        const h = await harness();
        const { cookie, email } = await signUp(h);
        const res = await deleteUser(h, cookie, { password: 'not-the-one-1' });
        expect(res.status).toBe(400);
        expect((await errorOf(res)).code).toBe('INVALID_PASSWORD');
        expect(userExists(h, email)).toBe(true);
        expect(await sessionOf(h, cookie)).not.toBeNull();
    });

    test('a user with a password must send it, even on a fresh session', async () => {
        const h = await harness();
        const { cookie, email } = await signUp(h);
        for (const body of [{}, { password: '' }, { password: 5 }]) {
            const res = await deleteUser(h, cookie, body);
            expect(res.status).toBe(400);
            expect((await errorOf(res)).code).toBe('PASSWORD_REQUIRED');
        }
        expect(userExists(h, email)).toBe(true);
    });

    test('a user without a password can delete on a fresh session', async () => {
        const h = await harness();
        const { cookie, email } = await signUp(h);
        makePasswordless(h, userId(h, email)!);
        const res = await deleteUser(h, cookie, {});
        expect(res.status).toBe(200);
        expect(userExists(h, email)).toBe(false);
    });

    test('a user without a password needs a recent sign-in', async () => {
        const h = await harness();
        const { cookie, email } = await signUp(h);
        const id = userId(h, email)!;
        makePasswordless(h, id);
        h.db
            .update(session)
            .set({
                createdAt: new Date(
                    Date.now() - (RECENT_SIGN_IN_SECONDS + 60) * 1000
                ),
            })
            .where(eq(session.userId, id))
            .run();
        const res = await deleteUser(h, cookie, {});
        expect(res.status).toBe(400);
        expect((await errorOf(res)).code).toBe('SESSION_EXPIRED');
        expect(userExists(h, email)).toBe(true);
    });

    test('rejects a token or callbackURL before anything is deleted', async () => {
        const h = await harness();
        const { cookie, email, password } = await signUp(h);
        for (const extra of [{ token: 'x' }, { callbackURL: '/' }]) {
            const res = await deleteUser(h, cookie, { password, ...extra });
            expect(res.status).toBe(400);
            expect((await errorOf(res)).code).toBe('INVALID_DELETE_REQUEST');
        }
        expect(userExists(h, email)).toBe(true);
    });

    test('needs a session, and the callback route does not exist', async () => {
        const h = await harness();
        const { email, password } = await signUp(h);
        const res = await deleteUser(h, undefined, { password });
        expect(res.status).toBe(401);
        const junk = await deleteUser(h, 'quizaroni.session_token=junk', {
            password,
        });
        expect(junk.status).toBe(401);
        expect(userExists(h, email)).toBe(true);

        const callback = await apiGet(
            h,
            '/api/auth/delete-user/callback?token=x'
        );
        expect(callback.status).toBe(404);
    });

    test('refuses the only admin, then allows it once another admin exists', async () => {
        const h = await harness();
        const adminCookie = await signIn(h, ADMIN_EMAIL, ADMIN_PASSWORD);
        const res = await deleteUser(h, adminCookie, {
            password: ADMIN_PASSWORD,
        });
        expect(res.status).toBe(403);
        expect((await errorOf(res)).code).toBe('LAST_ADMIN');
        expect(userExists(h, ADMIN_EMAIL)).toBe(true);
        expect(await sessionOf(h, adminCookie)).not.toBeNull();

        const { email } = await signUp(h);
        h.db
            .update(user)
            .set({ role: 'admin' })
            .where(eq(user.email, email))
            .run();
        const ok = await deleteUser(h, adminCookie, {
            password: ADMIN_PASSWORD,
        });
        expect(ok.status).toBe(200);
        expect(userExists(h, ADMIN_EMAIL)).toBe(false);
    });

    test('removes their files but not the copies other users made', async () => {
        const h = await harness();
        const alice = await signUp(h);
        const bob = await signUp(h);
        const aliceId = userId(h, alice.email)!;

        const set = await createSet(h, alice.cookie);
        await okJson(
            studysetPost(h, '/update-studyset', {
                cookie: alice.cookie,
                body: {
                    studysetUUID: set.studysetUUID,
                    updates: {
                        cards: [
                            {
                                cardUUID: 'c0',
                                term: 't',
                                definition: 'd',
                                files: [],
                            },
                        ],
                    },
                },
            })
        );
        await okJson(
            uploadCardFile(h, alice.cookie, {
                studysetUUID: set.studysetUUID,
                bytes: PNG_BYTES,
                cardUUID: 'c0',
                association: 'term',
            })
        );
        const stored = await getSet(h, alice.cookie, set.studysetUUID);
        const key = (stored.cards[0]!.files as { key: string }[])[0]!.key;
        expect(h.files.pathOf(key)).toBeDefined();
        expect(await Bun.file(h.files.pathOf(key)!).exists()).toBe(true);

        const avatarKey = `avatars/${aliceId}/${crypto.randomUUID()}`;
        const temp = `${h.dataDir}/avatar.tmp`;
        await Bun.write(temp, PNG_BYTES);
        h.files.place(temp, avatarKey);

        const bobSet = await createSet(h, bob.cookie);
        const copyKey = `${bobSet.studysetUUID}/${crypto.randomUUID()}`;
        h.files.copyAll([{ from: key, to: copyKey }]);
        expect(await Bun.file(h.files.pathOf(copyKey)!).exists()).toBe(true);

        const res = await deleteUser(h, alice.cookie, {
            password: alice.password,
        });
        expect(res.status).toBe(200);

        expect(await Bun.file(h.files.pathOf(key)!).exists()).toBe(false);
        expect(await Bun.file(h.files.pathOf(avatarKey)!).exists()).toBe(false);
        const served = await apiGet(h, `/api/files/${copyKey}`, {
            cookie: bob.cookie,
        });
        expect(served.status).toBe(200);
        expect(cookieFrom(served)).toBe('');
    });

    test('is rate limited like the other password checks', async () => {
        const h = await harness();
        const { cookie, email } = await signUp(h);
        const ip = nextTestIp();
        for (let i = 0; i < RATE_LIMITS.deleteUser.max; i++) {
            const res = await deleteUser(
                h,
                cookie,
                { password: 'not-the-one-1' },
                ipEnv(ip)
            );
            expect(res.status).toBe(400);
        }
        const limited = await deleteUser(
            h,
            cookie,
            { password: 'not-the-one-1' },
            ipEnv(ip)
        );
        expect(limited.status).toBe(429);
        expect(userExists(h, email)).toBe(true);
    });
});
