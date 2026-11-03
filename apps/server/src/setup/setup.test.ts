import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, DrizzleQueryError, eq } from 'drizzle-orm';
import { closeDatabase, type Db, openDatabase } from '../db';
import { account, user } from '../db/schema';
import { getSetting, SETTING } from '../settings';
import {
    bootstrapAdmin,
    clearSetupToken,
    completeSetup,
    describeDbError,
    isSetupComplete,
    issueSetupToken,
    SETUP_TOKEN_FILENAME,
    type SetupInput,
    SetupGate,
    tokensMatch,
} from './setup';

let root: string | undefined;
const open: Database[] = [];

function tempDir(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-setup-'));
    return root;
}

function openDb(dataDir: string): Db {
    const opened = openDatabase(dataDir);
    open.push(opened.sqlite);
    return opened.db;
}

function adminCount(db: Db): number {
    return db
        .select({ n: count() })
        .from(user)
        .where(eq(user.role, 'admin'))
        .get()!.n;
}

async function makeInput(): Promise<SetupInput> {
    return {
        name: 'Ada Admin',
        email: 'ada@example.com',
        passwordHash: await Bun.password.hash('correct-horse-1', {
            algorithm: 'argon2id',
        }),
        registrationMode: 'open',
        teacherPolicy: 'self_declared',
        publicUrl: 'https://quiz.example.org',
    };
}

afterEach(() => {
    for (const sqlite of open.splice(0)) {
        try {
            closeDatabase(sqlite);
        } catch {
            // already closed
        }
    }
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

describe('setup token file', () => {
    test('writes the returned token to the data dir', () => {
        const dir = tempDir();
        const token = issueSetupToken(dir);
        expect(token.length).toBeGreaterThanOrEqual(43);
        expect(readFileSync(join(dir, SETUP_TOKEN_FILENAME), 'utf8')).toBe(
            `${token}\n`
        );
    });

    test.skipIf(process.platform === 'win32')(
        'is readable only by the owner',
        () => {
            const dir = tempDir();
            issueSetupToken(dir);
            expect(
                statSync(join(dir, SETUP_TOKEN_FILENAME)).mode & 0o777
            ).toBe(0o600);
        }
    );

    test('issues a new token each time', () => {
        const dir = tempDir();
        expect(issueSetupToken(dir)).not.toBe(issueSetupToken(dir));
    });

    test('clearing removes the file and tolerates a missing one', () => {
        const dir = tempDir();
        issueSetupToken(dir);
        clearSetupToken(dir);
        expect(existsSync(join(dir, SETUP_TOKEN_FILENAME))).toBe(false);
        expect(() => clearSetupToken(dir)).not.toThrow();
    });

    test('clearing warns instead of throwing when removal fails', () => {
        const dir = tempDir();
        const path = join(dir, SETUP_TOKEN_FILENAME);
        mkdirSync(path);
        writeFileSync(join(path, 'x'), 'x');
        const warn = spyOn(console, 'warn').mockImplementation(() => {});
        try {
            expect(() => clearSetupToken(dir)).not.toThrow();
            expect(warn).toHaveBeenCalled();
            expect(String(warn.mock.calls[0]?.[0])).toContain(
                'Could not remove'
            );
        } finally {
            warn.mockRestore();
        }
    });
});

describe('tokensMatch', () => {
    test('accepts the same token, ignoring surrounding whitespace', () => {
        expect(tokensMatch('abc123', 'abc123')).toBe(true);
        expect(tokensMatch('abc123', '  abc123\n')).toBe(true);
    });

    test.each([['abc124'], [''], ['   '], ['abc1234']])(
        'rejects %j',
        (candidate) => {
            expect(tokensMatch('abc123', candidate)).toBe(false);
        }
    );
});

describe('completeSetup', () => {
    test('creates one admin with a credential account and the settings', async () => {
        const db = openDb(tempDir());
        const input = await makeInput();
        const now = new Date(1_800_000_000_000);
        const result = completeSetup(db, input, now);
        const users = db.select().from(user).all();
        expect(users).toHaveLength(1);
        const admin = users[0]!;
        expect(admin).toMatchObject({
            name: 'Ada Admin',
            email: 'ada@example.com',
            emailVerified: true,
            role: 'admin',
        });
        expect(result).toEqual({ status: 'created', userId: admin.id });
        const accounts = db.select().from(account).all();
        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({
            userId: admin.id,
            accountId: admin.id,
            providerId: 'credential',
        });
        expect(
            await Bun.password.verify(
                'correct-horse-1',
                accounts[0]!.password!
            )
        ).toBe(true);
        expect(getSetting(db, SETTING.registrationMode)).toBe('open');
        expect(getSetting(db, SETTING.teacherPolicy)).toBe('self_declared');
        expect(getSetting(db, SETTING.publicUrl)).toBe(
            'https://quiz.example.org'
        );
        expect(getSetting(db, SETTING.setupCompletedAt)).toBe(
            String(now.getTime())
        );
        expect(isSetupComplete(db)).toBe(true);
    });

    test('a second run reports already set up and creates nothing', async () => {
        const db = openDb(tempDir());
        const input = await makeInput();
        completeSetup(db, input);
        expect(
            completeSetup(db, { ...input, email: 'other@example.com' })
        ).toEqual({ status: 'already_set_up' });
        expect(adminCount(db)).toBe(1);
    });

    test('rechecks across connections to the same data dir', async () => {
        const dir = tempDir();
        const a = openDb(dir);
        const b = openDb(dir);
        const input = await makeInput();
        expect(completeSetup(a, input).status).toBe('created');
        expect(
            completeSetup(b, { ...input, email: 'b@example.com' })
        ).toEqual({ status: 'already_set_up' });
        expect(adminCount(b)).toBe(1);
    });

    test('an existing admin blocks setup even without the setting', async () => {
        const db = openDb(tempDir());
        const now = new Date();
        db.insert(user)
            .values({
                id: 'x',
                name: 'X',
                email: 'x@example.com',
                role: 'admin',
                createdAt: now,
                updatedAt: now,
            })
            .run();
        const input = await makeInput();
        expect(completeSetup(db, input)).toEqual({ status: 'already_set_up' });
        expect(adminCount(db)).toBe(1);
        // The instance already has an admin, so it must not stay locked in setup.
        expect(isSetupComplete(db)).toBe(true);
        expect(getSetting(db, SETTING.registrationMode)).toBeUndefined();
    });

    test(
        'waits for another process holding the write lock, then rechecks',
        async () => {
            const dir = tempDir();
            const db = openDb(dir);
            const input = await makeInput();
            const child = Bun.spawn(
                [
                    process.execPath,
                    join(import.meta.dir, 'fixtures', 'hold-lock.ts'),
                    dir,
                ],
                { stdout: 'pipe', stderr: 'pipe' }
            );
            const reader = child.stdout.getReader();
            const decoder = new TextDecoder();
            let seen = '';
            while (!seen.includes('locked')) {
                const { value, done } = await reader.read();
                if (done) {
                    throw new Error(
                        `hold-lock exited early: ${await new Response(child.stderr).text()}`
                    );
                }
                seen += decoder.decode(value);
            }
            expect(completeSetup(db, input)).toEqual({
                status: 'already_set_up',
            });
            expect(await child.exited).toBe(0);
            expect(adminCount(db)).toBe(1);
        },
        20_000
    );
});

describe('describeDbError', () => {
    test('reports only the driver cause of a failed query', () => {
        const err = new DrizzleQueryError(
            'insert into account',
            ['$argon2id$secret'],
            new Error('disk I/O error')
        );
        const text = describeDbError(err);
        expect(text).toBe('disk I/O error');
        expect(text).not.toContain('secret');
    });

    test('reports a plain error message', () => {
        expect(describeDbError(new Error('boom'))).toBe('boom');
    });
});

describe('SetupGate', () => {
    test('latches once setup completes', async () => {
        const db = openDb(tempDir());
        const gate = new SetupGate(db, 'tok');
        expect(gate.isComplete()).toBe(false);
        completeSetup(db, await makeInput());
        expect(gate.isComplete()).toBe(true);
    });

    test('markComplete runs the callback once', () => {
        const db = openDb(tempDir());
        let calls = 0;
        const gate = new SetupGate(db, 'tok', () => calls++);
        gate.markComplete();
        gate.markComplete();
        expect(calls).toBe(1);
        expect(gate.isComplete()).toBe(true);
    });

    test('checks the token, and rejects everything without one', () => {
        const db = openDb(tempDir());
        expect(new SetupGate(db, 'tok').checkToken('tok')).toBe(true);
        expect(new SetupGate(db, 'tok').checkToken('nope')).toBe(false);
        expect(new SetupGate(db, undefined).checkToken('')).toBe(false);
        expect(new SetupGate(db, undefined).checkToken('tok')).toBe(false);
    });
});

describe('bootstrapAdmin', () => {
    test('creates the admin named after the email local part', async () => {
        const db = openDb(tempDir());
        const result = await bootstrapAdmin(
            db,
            {
                email: 'root@example.com',
                password: 'correct-horse-1',
                registrationMode: 'invite_only',
                teacherPolicy: 'admin_approved',
            },
            undefined
        );
        expect(result).toBe('created');
        expect(db.select().from(user).get()).toMatchObject({
            name: 'root',
            email: 'root@example.com',
            role: 'admin',
        });
        expect(getSetting(db, SETTING.registrationMode)).toBe('invite_only');
        expect(getSetting(db, SETTING.teacherPolicy)).toBe('admin_approved');
        expect(getSetting(db, SETTING.publicUrl)).toBeUndefined();
    });
});
