import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ImportInputError } from './errors';
import { credentialOf, readLogtoUsers, socialAccountsOf } from './logto';
import { logtoRow, writeLogtoUsers } from './testing';

let root: string | undefined;
afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function file(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-logto-'));
    return join(root, 'logto-users.jsonl');
}

const ARGON2I = '$argon2i$v=19$m=8192,t=8,p=1$c2FsdA$aGFzaA';

test('reads default-tenant users and counts the rest', () => {
    const f = writeLogtoUsers(file(), [
        { id: 'a', primary_email: 'a@x.com', username: 'ann' },
        { id: 'b', tenant_id: 'admin' },
    ]);
    const { users, otherTenants } = readLogtoUsers(f);
    expect(users.map((u) => u.id)).toEqual(['a']);
    expect(users[0]?.primary_email).toBe('a@x.com');
    expect(otherTenants).toBe(1);
});

test('skips blank lines and ignores unknown columns', () => {
    const f = file();
    writeFileSync(
        f,
        '\n' +
            JSON.stringify({ ...logtoRow({ id: 'a' }), custom_column: 1 }) +
            '\n\n'
    );
    expect(readLogtoUsers(f).users).toHaveLength(1);
});

test('a bad line is an input error naming its line', () => {
    const f = file();
    writeFileSync(f, JSON.stringify(logtoRow({ id: 'a' })) + '\n{not json\n');
    expect(() => readLogtoUsers(f)).toThrow(ImportInputError);
    expect(() => readLogtoUsers(f)).toThrow(/line 2/);
    writeFileSync(f, JSON.stringify({ id: 1 }) + '\n');
    expect(() => readLogtoUsers(f)).toThrow(/line 1/);
});

describe('credentialOf', () => {
    const user = (row: Parameters<typeof logtoRow>[0]) => {
        const f = writeLogtoUsers(file(), [row]);
        const u = readLogtoUsers(f).users[0];
        if (!u) throw new Error('no user');
        return u;
    };

    test.each([
        ['Argon2i', ARGON2I],
        ['Argon2id', '$argon2id$v=19$m=65536,t=2,p=1$c2FsdA$aGFzaA'],
        ['Argon2d', '$argon2d$v=19$m=8192,t=8,p=1$c2FsdA$aGFzaA'],
    ])('%s keeps the hash', (method, hash) => {
        expect(
            credentialOf(
                user({
                    id: 'a',
                    password_encrypted: hash,
                    password_encryption_method: method,
                })
            )
        ).toEqual({ hash });
    });

    test.each(['Bcrypt', 'SHA1', 'SHA256', 'MD5', 'Legacy'])(
        '%s is unsupported',
        (method) => {
            expect(
                credentialOf(
                    user({
                        id: 'a',
                        password_encrypted: 'whatever',
                        password_encryption_method: method,
                    })
                )
            ).toEqual({ reason: 'unsupported_method' });
        }
    );

    test('a hash that does not match its method is unsupported', () => {
        expect(
            credentialOf(
                user({
                    id: 'a',
                    password_encrypted: ARGON2I,
                    password_encryption_method: 'Argon2id',
                })
            )
        ).toEqual({ reason: 'unsupported_method' });
    });

    test('no password', () => {
        expect(credentialOf(user({ id: 'a' }))).toEqual({
            reason: 'no_password',
        });
    });

    test('an expired password gets no credential', () => {
        expect(
            credentialOf(
                user({
                    id: 'a',
                    password_encrypted: ARGON2I,
                    password_encryption_method: 'Argon2i',
                    is_password_expired: true,
                })
            )
        ).toEqual({ reason: 'password_expired' });
    });

    test('a row without is_password_expired keeps its hash', () => {
        const u = user({
            id: 'a',
            password_encrypted: ARGON2I,
            password_encryption_method: 'Argon2i',
        });
        expect(u.is_password_expired).toBeUndefined();
        expect(credentialOf(u)).toEqual({ hash: ARGON2I });
    });
});

test('socialAccountsOf keeps the target as the provider', () => {
    const f = writeLogtoUsers(file(), [
        {
            id: 'a',
            identities: {
                google: { userId: 'g-1', details: { email: 'a@x.com' } },
                github: { userId: '42' },
            },
        },
    ]);
    const u = readLogtoUsers(f).users[0];
    expect(u && socialAccountsOf(u)).toEqual([
        { providerId: 'google', accountId: 'g-1' },
        { providerId: 'github', accountId: '42' },
    ]);
});
