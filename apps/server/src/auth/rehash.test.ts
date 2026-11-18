import { afterEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { account } from '../db/schema';
import {
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signIn,
} from '../testing/route-harness';
import { addUser } from '../testing/studysets';
import {
    CURRENT_HASH_PREFIX,
    hashPassword,
    needsRehash,
    verifyPassword,
} from './auth';

// Logto's decoy hash (packages/core/src/libraries/user-password-verification.ts):
// hash-wasm output for this password with Logto's production parameters.
const LOGTO_DECOY_HASH =
    '$argon2i$v=19$m=8192,t=8,p=1$bG9ndG8tZGVjb3ktc2FsdA$mH8wiuxK7kCjJZJRxvXCN5BxUczufmGgV1stRYErj6w';
const LOGTO_DECOY_PASSWORD = 'logto-decoy-do-not-use';

const logtoArgon2i = (password: string) =>
    Bun.password.hash(password, {
        algorithm: 'argon2i',
        memoryCost: 8192,
        timeCost: 8,
    });

describe('needsRehash', () => {
    test('a current argon2id hash is kept', async () => {
        const hash = await hashPassword('x');
        expect(hash.startsWith(CURRENT_HASH_PREFIX)).toBe(true);
        expect(needsRehash(hash)).toBe(false);
    });

    test('argon2i and bcrypt hashes are upgraded', async () => {
        expect(needsRehash(await logtoArgon2i('x'))).toBe(true);
        expect(needsRehash(LOGTO_DECOY_HASH)).toBe(true);
        expect(
            needsRehash(await Bun.password.hash('x', { algorithm: 'bcrypt' }))
        ).toBe(true);
    });
});

test("Logto's hash-wasm output verifies with Bun", async () => {
    expect(
        await verifyPassword({
            hash: LOGTO_DECOY_HASH,
            password: LOGTO_DECOY_PASSWORD,
        })
    ).toBe(true);
    expect(
        await verifyPassword({
            hash: LOGTO_DECOY_HASH,
            password: 'logto-decoy-do-not-usf',
        })
    ).toBe(false);
});

describe('signing in with an imported hash', () => {
    let current: RouteHarness | undefined;
    afterEach(() => {
        current?.close();
        current = undefined;
    });

    function storedHash(h: RouteHarness, userId: string): string | null {
        return (
            h.db
                .select({ password: account.password })
                .from(account)
                .where(
                    and(
                        eq(account.userId, userId),
                        eq(account.providerId, 'credential')
                    )
                )
                .get()?.password ?? null
        );
    }

    async function withImported(hash: string) {
        const h = (current = await createRouteHarness());
        const id = addUser(h.db, 'imported');
        const now = new Date();
        h.db.insert(account)
            .values({
                id: crypto.randomUUID(),
                accountId: id,
                providerId: 'credential',
                userId: id,
                password: hash,
                createdAt: now,
                updatedAt: now,
            })
            .run();
        return { h, id, email: `${id}@example.com` };
    }

    test('the old password works and the hash is upgraded', async () => {
        const { h, id, email } = await withImported(
            await logtoArgon2i('old-password-1')
        );
        await signIn(h, email, 'old-password-1');
        const upgraded = storedHash(h, id);
        expect(upgraded?.startsWith(CURRENT_HASH_PREFIX)).toBe(true);
        expect(
            await verifyPassword({
                hash: upgraded ?? '',
                password: 'old-password-1',
            })
        ).toBe(true);
        await signIn(h, email, 'old-password-1');
    });

    test("Logto's own hash-wasm hash signs in", async () => {
        const { h, id, email } = await withImported(LOGTO_DECOY_HASH);
        await signIn(h, email, LOGTO_DECOY_PASSWORD);
        expect(storedHash(h, id)?.startsWith(CURRENT_HASH_PREFIX)).toBe(true);
    });

    test('a wrong password is refused and the hash is left alone', async () => {
        const original = await logtoArgon2i('old-password-1');
        const { h, id, email } = await withImported(original);
        const res = await apiRequest(h, '/api/auth/sign-in/email', {
            body: { email, password: 'wrong-password-1' },
        });
        expect(res.status).toBe(401);
        expect(storedHash(h, id)).toBe(original);
    });
});
