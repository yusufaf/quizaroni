import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { closeDatabase, type Db, openMemoryDatabase } from '../db';
import {
    account,
    mailOutbox,
    registrationInvite,
    resetEmailLog,
    session,
    studyset,
    user,
    userProfile,
    verification,
} from '../db/schema';
import {
    accountDeletionSummary,
    deleteAccountData,
    hasPassword,
    isLastAdmin,
} from './delete-account';

const T0 = new Date('2026-11-01T10:00:00.000Z');
const LATER = new Date(T0.getTime() + 1e9);
const SET_A = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const SET_B = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const SET_C = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

let sqlite: ReturnType<typeof openMemoryDatabase>['sqlite'];
let db: Db;

beforeEach(() => {
    ({ sqlite, db } = openMemoryDatabase());
});

afterEach(() => {
    closeDatabase(sqlite);
});

function addUser(
    id: string,
    o: { role?: string; password?: string | null; provider?: string } = {}
) {
    db.insert(user)
        .values({
            id,
            name: id,
            email: `${id}@example.com`,
            role: o.role ?? 'user',
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    db.insert(account)
        .values({
            id: `acc-${id}-${o.provider ?? 'credential'}`,
            accountId: id,
            providerId: o.provider ?? 'credential',
            userId: id,
            password: o.provider
                ? null
                : o.password === undefined
                  ? 'hash'
                  : o.password,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    db.insert(session)
        .values({
            id: `sess-${id}`,
            token: `token-${id}`,
            userId: id,
            expiresAt: LATER,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    db.insert(userProfile)
        .values({
            userId: id,
            username: id,
            metadata: {},
            labels: [],
            updatedAt: T0,
        })
        .run();
}

function addSet(id: string, ownerId: string, o: { listed?: boolean } = {}) {
    db.insert(studyset)
        .values({
            studysetUUID: id,
            ownerId,
            title: id,
            description: '',
            favorited: false,
            cards: [],
            categories: [],
            labels: [],
            metadata: {},
            lastViewed: T0,
            createdAt: T0,
            updatedAt: T0,
            isPublic: o.listed ?? false,
            publishedAt: o.listed ? T0 : null,
        })
        .run();
}

function addMail(id: string, kind: 'password_reset' | 'invite', to: string) {
    db.insert(mailOutbox)
        .values({
            id,
            kind,
            recipient: to,
            subject: 's',
            body: 'b',
            link: 'l',
            delivery: 'outbox',
            createdAt: T0,
            expiresAt: LATER,
        })
        .run();
}

describe('deleteAccountData', () => {
    test('removes the user and everything cascading from them, and only them', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice');
        addUser('bob');
        addSet(SET_A, 'alice');
        addSet(SET_B, 'alice', { listed: true });
        addSet(SET_C, 'bob');

        const result = deleteAccountData(db, 'alice');
        expect(result.status).toBe('deleted');

        const ids = (rows: { id?: string }[]) => rows.map((r) => r.id).sort();
        expect(ids(db.select().from(user).all())).toEqual(['admin', 'bob']);
        expect(
            db
                .select()
                .from(account)
                .all()
                .map((a) => a.userId)
                .sort()
        ).toEqual(['admin', 'bob']);
        expect(
            db
                .select()
                .from(session)
                .all()
                .map((s) => s.userId)
                .sort()
        ).toEqual(['admin', 'bob']);
        expect(
            db
                .select()
                .from(userProfile)
                .all()
                .map((p) => p.userId)
                .sort()
        ).toEqual(['admin', 'bob']);
        expect(
            db
                .select()
                .from(studyset)
                .all()
                .map((s) => s.studysetUUID)
        ).toEqual([SET_C]);
    });

    test('returns the ids of every owned set', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice');
        addSet(SET_A, 'alice');
        addSet(SET_B, 'alice');
        const result = deleteAccountData(db, 'alice');
        expect(result.status).toBe('deleted');
        if (result.status === 'deleted') {
            expect([...result.studysetIds].sort()).toEqual(
                [SET_A, SET_B].sort()
            );
        }
    });

    test('removes their mail, reset log and reset tokens but keeps the rest', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice');
        addUser('bob');
        addMail('m1', 'password_reset', 'alice@example.com');
        addMail('m2', 'invite', 'alice@example.com');
        addMail('m3', 'password_reset', 'bob@example.com');
        addMail('m4', 'invite', 'carol@example.com');
        for (const [id, recipient] of [
            ['l1', 'alice@example.com'],
            ['l2', 'bob@example.com'],
        ] as const) {
            db.insert(resetEmailLog)
                .values({ id, recipient, createdAt: T0 })
                .run();
        }
        for (const [id, value] of [
            ['v1', 'alice'],
            ['v2', 'bob'],
        ] as const) {
            db.insert(verification)
                .values({
                    id,
                    identifier: `reset-password:${id}`,
                    value,
                    expiresAt: LATER,
                    createdAt: T0,
                    updatedAt: T0,
                })
                .run();
        }
        db.insert(registrationInvite)
            .values({
                id: 'inv-email',
                tokenHash: 'h-email',
                email: 'alice@example.com',
                createdAt: T0,
                expiresAt: LATER,
            })
            .run();

        expect(deleteAccountData(db, 'alice').status).toBe('deleted');

        expect(
            db
                .select()
                .from(mailOutbox)
                .all()
                .map((m) => m.id)
                .sort()
        ).toEqual(['m3', 'm4']);
        expect(
            db
                .select()
                .from(resetEmailLog)
                .all()
                .map((r) => r.id)
        ).toEqual(['l2']);
        expect(
            db
                .select()
                .from(verification)
                .all()
                .map((v) => v.id)
        ).toEqual(['v2']);
        expect(
            db
                .select()
                .from(registrationInvite)
                .all()
                .map((i) => i.email)
        ).toEqual(['alice@example.com']);
    });

    test('keeps invites the user created, with no creator', () => {
        addUser('admin', { role: 'admin' });
        addUser('boss', { role: 'admin' });
        db.insert(registrationInvite)
            .values({
                id: 'inv',
                tokenHash: 'h',
                createdBy: 'boss',
                createdAt: T0,
                expiresAt: LATER,
            })
            .run();
        expect(deleteAccountData(db, 'boss').status).toBe('deleted');
        const invite = db.select().from(registrationInvite).get();
        expect(invite?.id).toBe('inv');
        expect(invite?.createdBy).toBeNull();
    });

    test('refuses the only admin and writes nothing', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice');
        addSet(SET_A, 'admin');
        db.insert(resetEmailLog)
            .values({ id: 'l1', recipient: 'admin@example.com', createdAt: T0 })
            .run();
        expect(deleteAccountData(db, 'admin')).toEqual({
            status: 'last_admin',
        });
        expect(db.select().from(user).all()).toHaveLength(2);
        expect(db.select().from(studyset).all()).toHaveLength(1);
        expect(db.select().from(resetEmailLog).all()).toHaveLength(1);
    });

    test('lets an admin go once another admin exists', () => {
        addUser('admin', { role: 'admin' });
        addUser('second', { role: 'admin' });
        expect(deleteAccountData(db, 'admin').status).toBe('deleted');
        expect(db.select().from(user).all()).toHaveLength(1);
    });

    test('reports an unknown id', () => {
        addUser('alice');
        expect(deleteAccountData(db, 'nobody')).toEqual({
            status: 'not_found',
        });
        expect(db.select().from(user).all()).toHaveLength(1);
    });
});

describe('hasPassword and isLastAdmin', () => {
    test('hasPassword is true only for a credential account with a password', () => {
        addUser('pw');
        addUser('social', { provider: 'google' });
        addUser('empty', { password: null });
        expect(hasPassword(db, 'pw')).toBe(true);
        expect(hasPassword(db, 'social')).toBe(false);
        expect(hasPassword(db, 'empty')).toBe(false);
        expect(hasPassword(db, 'nobody')).toBe(false);
    });

    test('isLastAdmin needs an admin with no other admin', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice');
        expect(isLastAdmin(db, 'admin')).toBe(true);
        expect(isLastAdmin(db, 'alice')).toBe(false);
        addUser('second', { role: 'admin' });
        expect(isLastAdmin(db, 'admin')).toBe(false);
    });
});

describe('accountDeletionSummary', () => {
    test('counts sets and listed sets, lists social providers and flags the last admin', () => {
        addUser('admin', { role: 'admin' });
        addUser('alice', { provider: 'google' });
        db.insert(account)
            .values({
                id: 'acc-alice-github',
                accountId: 'gh',
                providerId: 'github',
                userId: 'alice',
                createdAt: T0,
                updatedAt: T0,
            })
            .run();
        addSet(SET_A, 'alice');
        addSet(SET_B, 'alice', { listed: true });

        const summary = accountDeletionSummary(db, 'alice');
        expect(summary.hasPassword).toBe(false);
        expect([...summary.providers].sort()).toEqual(['github', 'google']);
        expect(summary.lastAdmin).toBe(false);
        expect(summary.studysets).toBe(2);
        expect(summary.publishedStudysets).toBe(1);

        expect(accountDeletionSummary(db, 'admin')).toEqual({
            hasPassword: true,
            providers: [],
            lastAdmin: true,
            studysets: 0,
            publishedStudysets: 0,
        });
    });
});
