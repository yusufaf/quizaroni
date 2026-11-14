import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { registrationInvite } from '../db/schema';
import { addUser, openTestDb } from '../testing/studysets';
import {
    claimInvite,
    createInvite,
    findUsableInvite,
    hashInviteToken,
    INVITE_DAYS_DEFAULT,
    inviteLink,
    listInvites,
    revokeInvite,
} from './invites';

const NOW = new Date('2026-11-10T10:00:00.000Z');
const DAY = 86_400_000;

let current: ReturnType<typeof openTestDb> | undefined;
function setup(): { db: Db; admin: string } {
    current = openTestDb();
    return { db: current.db, admin: addUser(current.db, 'admin') };
}
afterEach(() => {
    current?.close();
    current = undefined;
});

describe('createInvite', () => {
    test('stores only a hash of the token', () => {
        const { db, admin } = setup();
        const { invite, token } = createInvite(db, { createdBy: admin }, NOW);
        expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const row = db
            .select()
            .from(registrationInvite)
            .where(eq(registrationInvite.id, invite.id))
            .get();
        expect(row?.tokenHash).toBe(hashInviteToken(token));
        expect(Object.values(row ?? {})).not.toContain(token);
    });

    test('defaults to single use and a 7 day expiry', () => {
        const { db, admin } = setup();
        const { invite } = createInvite(db, { createdBy: admin }, NOW);
        expect(invite).toMatchObject({
            email: null,
            maxUses: 1,
            uses: 0,
            status: 'active',
            revokedAt: null,
            createdAt: NOW.toISOString(),
            expiresAt: new Date(NOW.getTime() + INVITE_DAYS_DEFAULT * DAY).toISOString(),
        });
    });

    test('an email-locked invite is single use', () => {
        const { db, admin } = setup();
        const { invite } = createInvite(
            db,
            { createdBy: admin, email: 'ada@example.com', maxUses: 5, days: 1 },
            NOW
        );
        expect(invite.maxUses).toBe(1);
        expect(invite.email).toBe('ada@example.com');
    });
});

test('inviteLink points at the sign-up page', () => {
    expect(inviteLink('https://quiz.example.org', 'a_b-c')).toBe(
        'https://quiz.example.org/signUp?invite=a_b-c'
    );
});

describe('findUsableInvite', () => {
    test('finds an active invite and nothing else', () => {
        const { db, admin } = setup();
        const active = createInvite(db, { createdBy: admin, email: 'ada@example.com' }, NOW);
        expect(findUsableInvite(db, active.token, NOW)).toEqual({
            id: active.invite.id,
            email: 'ada@example.com',
        });

        const expired = createInvite(db, { createdBy: admin, days: 1 }, NOW);
        expect(findUsableInvite(db, expired.token, new Date(NOW.getTime() + DAY))).toBeUndefined();

        const revoked = createInvite(db, { createdBy: admin }, NOW);
        revokeInvite(db, revoked.invite.id, NOW);
        expect(findUsableInvite(db, revoked.token, NOW)).toBeUndefined();

        const used = createInvite(db, { createdBy: admin }, NOW);
        expect(claimInvite(db, used.token, NOW)).toBe(true);
        expect(findUsableInvite(db, used.token, NOW)).toBeUndefined();

        expect(findUsableInvite(db, 'unknown', NOW)).toBeUndefined();
        expect(findUsableInvite(db, '', NOW)).toBeUndefined();
    });
});

describe('claimInvite', () => {
    test('stops at maxUses', () => {
        const { db, admin } = setup();
        const { invite, token } = createInvite(db, { createdBy: admin, maxUses: 2 }, NOW);
        expect(claimInvite(db, token, NOW)).toBe(true);
        expect(claimInvite(db, token, NOW)).toBe(true);
        expect(claimInvite(db, token, NOW)).toBe(false);
        expect(listInvites(db, NOW).find((i) => i.id === invite.id)?.uses).toBe(2);
    });

    test('refuses expired, revoked and unknown tokens', () => {
        const { db, admin } = setup();
        const expired = createInvite(db, { createdBy: admin, days: 1 }, NOW);
        expect(claimInvite(db, expired.token, new Date(NOW.getTime() + DAY))).toBe(false);
        const revoked = createInvite(db, { createdBy: admin }, NOW);
        revokeInvite(db, revoked.invite.id, NOW);
        expect(claimInvite(db, revoked.token, NOW)).toBe(false);
        expect(claimInvite(db, 'unknown', NOW)).toBe(false);
        expect(claimInvite(db, '', NOW)).toBe(false);
    });
});

describe('listInvites', () => {
    test('lists newest first with a status for each', () => {
        const { db, admin } = setup();
        const active = createInvite(db, { createdBy: admin }, NOW);
        const used = createInvite(db, { createdBy: admin }, new Date(NOW.getTime() + 1));
        claimInvite(db, used.token, NOW);
        const expired = createInvite(db, { createdBy: admin, days: 1 }, new Date(NOW.getTime() - DAY - 2));
        const revoked = createInvite(db, { createdBy: admin }, new Date(NOW.getTime() + 2));
        revokeInvite(db, revoked.invite.id, NOW);
        claimInvite(db, revoked.token, NOW);

        const list = listInvites(db, NOW);
        expect(list.map((i) => [i.id, i.status])).toEqual([
            [revoked.invite.id, 'revoked'],
            [used.invite.id, 'used'],
            [active.invite.id, 'active'],
            [expired.invite.id, 'expired'],
        ]);
        expect(list[0]?.revokedAt).toBe(NOW.toISOString());
    });
});

describe('revokeInvite', () => {
    test('returns undefined for an unknown id', () => {
        const { db } = setup();
        expect(revokeInvite(db, 'missing', NOW)).toBeUndefined();
    });

    test('keeps the first revoke time', () => {
        const { db, admin } = setup();
        const { invite } = createInvite(db, { createdBy: admin }, NOW);
        revokeInvite(db, invite.id, NOW);
        const again = revokeInvite(db, invite.id, new Date(NOW.getTime() + DAY));
        expect(again?.revokedAt).toBe(NOW.toISOString());
    });
});
