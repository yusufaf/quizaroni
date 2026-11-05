import { describe, expect, test } from 'bun:test';
import { DrizzleQueryError } from 'drizzle-orm';
import { sanitizeLogArg } from '../db/errors';
import {
    hashPassword,
    lazyAuth,
    scrubAuthEnv,
    verifyPassword,
    type AuthContext,
} from './auth';

describe('verifyPassword', () => {
    test('accepts the password a hash was made from', async () => {
        const hash = await hashPassword('correct-horse-1');
        expect(hash.startsWith('$argon2id$')).toBe(true);
        expect(
            await verifyPassword({ hash, password: 'correct-horse-1' })
        ).toBe(true);
    });

    test('rejects a wrong password', async () => {
        const hash = await hashPassword('correct-horse-1');
        expect(await verifyPassword({ hash, password: 'wrong-horse-1' })).toBe(
            false
        );
    });

    test('returns false for a malformed or foreign hash instead of throwing', async () => {
        expect(
            await verifyPassword({ hash: 'not-a-hash', password: 'x' })
        ).toBe(false);
        expect(
            await verifyPassword({
                hash: 'c2FsdA:a2V5a2V5a2V5',
                password: 'x',
            })
        ).toBe(false);
    });
});

describe('sanitizeLogArg', () => {
    const queryError = () =>
        new DrizzleQueryError(
            'insert into "account" values (?)',
            ['$argon2id$secret'],
            new Error('UNIQUE constraint failed')
        );

    test('keeps only the cause message of a query error', () => {
        const out = sanitizeLogArg(queryError());
        expect(Bun.inspect(out)).not.toContain('secret');
        expect(Bun.inspect(out)).toContain('UNIQUE constraint failed');
    });

    test('also sanitizes an error caused by a query error', () => {
        const wrapped = new Error('Failed to create user', {
            cause: queryError(),
        });
        expect(Bun.inspect(sanitizeLogArg(wrapped))).not.toContain('secret');
    });

    test('passes other values through', () => {
        const err = new Error('plain');
        expect(sanitizeLogArg(err)).toBe(err);
        expect(sanitizeLogArg('text')).toBe('text');
    });
});

describe('lazyAuth', () => {
    test('creates the auth context once', () => {
        let calls = 0;
        const handle = lazyAuth(() => {
            calls++;
            return { publicUrl: 'http://x' } as AuthContext;
        });
        expect(calls).toBe(0);
        expect(handle()).toBe(handle());
        expect(calls).toBe(1);
    });
});

describe('scrubAuthEnv', () => {
    test('removes Better Auth env vars that would widen trust', () => {
        const env: Record<string, string | undefined> = {
            BETTER_AUTH_TRUSTED_ORIGINS: 'https://evil.example',
            QZ_PORT: '1',
        };
        expect(scrubAuthEnv(env)).toEqual(['BETTER_AUTH_TRUSTED_ORIGINS']);
        expect(env).toEqual({ QZ_PORT: '1' });
    });

    test('returns nothing when none is set', () => {
        expect(scrubAuthEnv({})).toEqual([]);
        expect(scrubAuthEnv({ BETTER_AUTH_TRUSTED_ORIGINS: '' })).toEqual([]);
    });
});
