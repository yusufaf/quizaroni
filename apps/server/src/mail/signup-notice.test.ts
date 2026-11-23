import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { account } from '../db/schema';
import { fakeTransport } from '../auth/testing';
import { addUser, openTestDb, T0 } from '../testing/studysets';
import { Mailer } from './mailer';
import {
    createSignupNotifier,
    type SignupMethod,
    signupNoticeMessage,
} from './signup-notice';

const PUBLIC_URL = 'https://quiz.example.org';
const OPS = 'ops@example.org';

let current: ReturnType<typeof openTestDb> | undefined;
afterEach(() => {
    current?.close();
    current = undefined;
});

function freshDb() {
    current = openTestDb();
    return current.db;
}

function messageFor(method: SignupMethod, name = 'Ada Lovelace') {
    return signupNoticeMessage({
        to: OPS,
        name,
        email: 'ada@example.com',
        method,
        at: new Date('2026-11-22T09:30:15.123Z'),
        publicUrl: PUBLIC_URL,
    });
}

describe('signupNoticeMessage', () => {
    test('has a constant subject and the details in the body', () => {
        const m = messageFor('google');
        expect(m.to).toBe(OPS);
        expect(m.subject).toBe('New sign-up on Quizaroni');
        expect(m.text.split('\n')).toEqual([
            `A new account was created on the Quizaroni server at ${PUBLIC_URL}.`,
            '',
            'Name: Ada Lovelace',
            'Email: ada@example.com',
            'Signed up with: Google',
            'Time: 2026-11-22T09:30:15.123Z',
            '',
            `Admin page: ${PUBLIC_URL}/admin`,
            '',
            'You get this email because QZ_SIGNUP_NOTIFY_EMAIL is set on this server.',
        ]);
    });

    test('names the method', () => {
        const label = (method: SignupMethod) =>
            /Signed up with: (.*)/.exec(messageFor(method).text)?.[1];
        expect(label('google')).toBe('Google');
        expect(label('github')).toBe('GitHub');
        expect(label('email')).toBe('email and password');
        expect(label('invite')).toBe('email and password (invite link)');
        expect(label('other')).toBe('another method');
    });

    test('flattens control characters and newlines in the name', () => {
        const m = messageFor(
            'email',
            'Eve\r\nBcc: evil@example.com\u0007x\u2028y'
        );
        expect(m.text).toContain('Name: Eve  Bcc: evil@example.com x y');
        expect(m.text.split('\n')).toHaveLength(10);
        expect(m.subject).toBe('New sign-up on Quizaroni');
    });
});

function withAccount(db: ReturnType<typeof freshDb>, id: string): string {
    addUser(db, id);
    db.insert(account)
        .values({
            id: `acct-${id}`,
            accountId: id,
            providerId: 'credential',
            userId: id,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    return id;
}

async function settle(mailer: Mailer): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    await mailer.flush();
}

function quiet() {
    const lines: string[] = [];
    const spy = spyOn(console, 'warn').mockImplementation((...args) => {
        lines.push(args.map(String).join(' '));
    });
    return { lines, restore: () => spy.mockRestore() };
}

describe('createSignupNotifier', () => {
    test('sends one notice once the account row exists', async () => {
        const db = freshDb();
        const { transport, sent } = fakeTransport();
        const mailer = new Mailer(db, transport);
        const id = withAccount(db, 'u1');
        const notify = createSignupNotifier({
            mailer,
            to: OPS,
            publicUrl: PUBLIC_URL,
            db,
            now: () => new Date('2026-11-22T09:30:15.123Z'),
        });
        notify({
            userId: id,
            name: 'Ada',
            email: 'ada@example.com',
            method: 'github',
        });
        await settle(mailer);
        expect(sent).toHaveLength(1);
        expect(sent[0]).toEqual(messageFor('github', 'Ada'));
    });

    test('sends nothing when no account row was written', async () => {
        const db = freshDb();
        const { transport, sent } = fakeTransport();
        const mailer = new Mailer(db, transport);
        addUser(db, 'orphan');
        const notify = createSignupNotifier({
            mailer,
            to: OPS,
            publicUrl: PUBLIC_URL,
            db,
        });
        notify({
            userId: 'orphan',
            name: 'O',
            email: 'o@example.com',
            method: 'email',
        });
        await settle(mailer);
        expect(sent).toEqual([]);
    });

    test('drops notices over the cap and says so once per window', async () => {
        const db = freshDb();
        const { transport, sent } = fakeTransport();
        const mailer = new Mailer(db, transport);
        let clock = Date.parse('2026-11-22T09:00:00.000Z');
        const notify = createSignupNotifier({
            mailer,
            to: OPS,
            publicUrl: PUBLIC_URL,
            db,
            limit: { max: 30, windowMs: 3_600_000 },
            now: () => new Date(clock),
        });
        const output = quiet();
        try {
            for (let i = 0; i < 33; i++) {
                const id = withAccount(db, `u${i}`);
                notify({
                    userId: id,
                    name: id,
                    email: `${id}@example.com`,
                    method: 'email',
                });
                await settle(mailer);
            }
            expect(sent).toHaveLength(30);
            expect(output.lines).toHaveLength(1);
            expect(output.lines[0]).toContain('30');

            clock += 3_600_001;
            const id = withAccount(db, 'later');
            notify({
                userId: id,
                name: id,
                email: 'later@example.com',
                method: 'email',
            });
            await settle(mailer);
            expect(sent).toHaveLength(31);
            expect(output.lines).toHaveLength(1);
        } finally {
            output.restore();
        }
    });
});
