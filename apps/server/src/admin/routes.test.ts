import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { instanceSettings, mailOutbox } from '../db/schema';
import { SETTING } from '../settings';
import {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    apiGet,
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signIn,
    signUp,
} from '../testing/route-harness';

let h: RouteHarness | undefined;
afterEach(() => {
    h?.close();
    h = undefined;
});

async function setup() {
    h = await createRouteHarness();
    const admin = await signIn(h, ADMIN_EMAIL, ADMIN_PASSWORD);
    return { h, admin };
}

type CreateResponse = {
    invite: {
        id: string;
        email: string | null;
        maxUses: number;
        status: string;
    };
    link: string;
    delivery?: string;
};

function inviteOnly(harness: RouteHarness) {
    harness.db
        .update(instanceSettings)
        .set({ value: 'invite_only' })
        .where(eq(instanceSettings.key, SETTING.registrationMode))
        .run();
}

const signUpWith = (
    harness: RouteHarness,
    inviteToken: string,
    email: string
) =>
    apiRequest(harness, '/api/auth/sign-up/email', {
        body: { name: 'Bea', email, password: 'bea-password-1', inviteToken },
    });

describe('admin routes', () => {
    test('need an admin session', async () => {
        const { h, admin } = await setup();
        const user = await signUp(h);
        const calls = (cookie?: string) => [
            apiGet(h, '/api/admin/invites', { cookie }),
            apiRequest(h, '/api/admin/invites', { cookie, body: {} }),
            apiRequest(h, '/api/admin/invites/x/revoke', { cookie }),
            apiGet(h, '/api/admin/outbox', { cookie }),
        ];
        for (const res of await Promise.all(calls()))
            expect(res.status).toBe(401);
        for (const res of await Promise.all(calls(user.cookie))) {
            expect(res.status).toBe(403);
        }
        expect(
            (await apiGet(h, '/api/admin/invites', { cookie: admin })).status
        ).toBe(200);
        expect(
            (await apiGet(h, '/api/admin/outbox', { cookie: admin })).status
        ).toBe(200);
    });

    test('responses are not cached', async () => {
        const { h, admin } = await setup();
        const res = await apiGet(h, '/api/admin/invites', { cookie: admin });
        expect(res.headers.get('cache-control')).toBe('no-store');
    });

    test('an invite without an email returns its link and sends nothing', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            body: { days: 30, maxUses: 5 },
        });
        expect(res.status).toBe(201);
        const created = (await res.json()) as CreateResponse;
        expect(created.link).toStartWith('http://localhost/signUp?invite=');
        expect(created.delivery).toBeUndefined();
        expect(created.invite).toMatchObject({
            email: null,
            maxUses: 5,
            status: 'active',
        });
        const outbox = (await (
            await apiGet(h, '/api/admin/outbox', { cookie: admin })
        ).json()) as { smtp: boolean; messages: unknown[] };
        expect(outbox).toEqual({ smtp: false, messages: [] });
        const list = (await (
            await apiGet(h, '/api/admin/invites', { cookie: admin })
        ).json()) as { invites: { id: string }[] };
        expect(list.invites.map((i) => i.id)).toEqual([created.invite.id]);
    });

    test('a blank email means anyone', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            body: { email: '  ', maxUses: 5 },
        });
        expect(res.status).toBe(201);
        const created = (await res.json()) as CreateResponse;
        expect(created.invite).toMatchObject({ email: null, maxUses: 5 });
        expect(created.delivery).toBeUndefined();
    });

    test('an emailed invite lands in the outbox and signs the user up', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            body: { email: 'Bea@Example.com' },
        });
        expect(res.status).toBe(201);
        const created = (await res.json()) as CreateResponse;
        expect(created.delivery).toBe('outbox');
        expect(created.invite).toMatchObject({
            email: 'bea@example.com',
            maxUses: 1,
        });
        const outbox = (await (
            await apiGet(h, '/api/admin/outbox', { cookie: admin })
        ).json()) as { messages: { kind: string; to: string; link: string }[] };
        expect(outbox.messages).toHaveLength(1);
        expect(outbox.messages[0]).toMatchObject({
            kind: 'invite',
            to: 'bea@example.com',
            link: created.link,
        });

        inviteOnly(h);
        const token = new URL(created.link).searchParams.get('invite')!;
        expect((await signUpWith(h, token, 'bea@example.com')).status).toBe(
            200
        );
    });

    test('a revoked invite no longer signs anyone up', async () => {
        const { h, admin } = await setup();
        const created = (await (
            await apiRequest(h, '/api/admin/invites', {
                cookie: admin,
                body: {},
            })
        ).json()) as CreateResponse;
        const revoke = await apiRequest(
            h,
            `/api/admin/invites/${created.invite.id}/revoke`,
            { cookie: admin }
        );
        expect(revoke.status).toBe(200);
        expect(((await revoke.json()) as CreateResponse).invite.status).toBe(
            'revoked'
        );
        inviteOnly(h);
        const token = new URL(created.link).searchParams.get('invite')!;
        const res = await signUpWith(h, token, 'late@example.com');
        expect(res.status).toBe(403);
        expect(((await res.json()) as { code: string }).code).toBe(
            'INVITE_INVALID'
        );
    });

    test('the outbox drops an invite once it is used or revoked', async () => {
        const { h, admin } = await setup();
        const create = async (email: string) =>
            (await (
                await apiRequest(h, '/api/admin/invites', {
                    cookie: admin,
                    body: { email },
                })
            ).json()) as CreateResponse;
        const outboxTo = async () =>
            (
                (await (
                    await apiGet(h, '/api/admin/outbox', { cookie: admin })
                ).json()) as { messages: { to: string }[] }
            ).messages
                .map((m) => m.to)
                .sort();
        const used = await create('used@example.com');
        const revoked = await create('revoked@example.com');
        await create('pending@example.com');
        expect(await outboxTo()).toEqual([
            'pending@example.com',
            'revoked@example.com',
            'used@example.com',
        ]);

        inviteOnly(h);
        const token = new URL(used.link).searchParams.get('invite')!;
        expect((await signUpWith(h, token, 'used@example.com')).status).toBe(
            200
        );
        await apiRequest(h, `/api/admin/invites/${revoked.invite.id}/revoke`, {
            cookie: admin,
        });
        expect(await outboxTo()).toEqual(['pending@example.com']);
    });

    test('an invite message whose link has no readable token stays listed', async () => {
        const { h, admin } = await setup();
        const now = new Date();
        for (const [id, link] of [
            ['bad-url', 'not a url'],
            ['no-token', 'http://localhost/signUp'],
        ] as const) {
            h.db
                .insert(mailOutbox)
                .values({
                    id,
                    kind: 'invite',
                    recipient: `${id}@example.com`,
                    subject: 's',
                    body: 'b',
                    link,
                    delivery: 'outbox',
                    createdAt: now,
                    expiresAt: new Date(now.getTime() + 3600_000),
                })
                .run();
        }
        const res = await apiGet(h, '/api/admin/outbox', { cookie: admin });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { messages: { id: string }[] };
        expect(body.messages.map((m) => m.id).sort()).toEqual([
            'bad-url',
            'no-token',
        ]);
    });

    test('revoking an unknown invite is a 404', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites/missing/revoke', {
            cookie: admin,
        });
        expect(res.status).toBe(404);
    });

    test.each([
        [{ days: 31 }],
        [{ days: 0 }],
        [{ maxUses: 0 }],
        [{ maxUses: 101 }],
        [{ email: 'a@example.com', maxUses: 2 }],
        [{ email: 'not-an-email' }],
        [{ role: 'admin' }],
        [{ days: '7' }],
    ])('rejects %p', async (body) => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            body,
        });
        expect(res.status).toBe(400);
    });

    test('rejects invalid JSON', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            rawBody: '{',
        });
        expect(res.status).toBe(400);
    });

    test('a cross-origin POST is refused', async () => {
        const { h, admin } = await setup();
        const res = await apiRequest(h, '/api/admin/invites', {
            cookie: admin,
            body: {},
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
    });
});
