import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { Db } from '../db';
import { mailOutbox } from '../db/schema';
import { openTestDb } from '../testing/studysets';
import {
    type MailMessage,
    type MailTransport,
    Mailer,
    mailFailureCode,
    OUTBOX_MAX_ROWS,
} from './mailer';

const T0 = new Date('2026-11-01T10:00:00.000Z');
const LATER = new Date('2026-11-01T12:00:00.000Z');

let current: ReturnType<typeof openTestDb> | undefined;
function freshDb(): Db {
    current = openTestDb();
    return current.db;
}
afterEach(() => {
    current?.close();
    current = undefined;
});

function message(o: Partial<MailMessage> = {}): MailMessage {
    return {
        kind: 'password_reset',
        to: 'ada@example.com',
        subject: 'Reset your Quizaroni password',
        text: 'Open http://localhost/reset-password?token=abc',
        link: 'http://localhost/reset-password?token=abc',
        expiresAt: new Date(T0.getTime() + 3600_000),
        ...o,
    };
}

function okTransport() {
    const sent: { to: string; subject: string; text: string }[] = [];
    const transport: MailTransport = {
        send: async (m) => {
            sent.push(m);
        },
    };
    return { transport, sent };
}

function captureConsole() {
    const lines: string[] = [];
    const record = (...args: unknown[]) => {
        lines.push(args.map(String).join(' '));
    };
    const spies = [
        spyOn(console, 'error').mockImplementation(record),
        spyOn(console, 'warn').mockImplementation(record),
        spyOn(console, 'log').mockImplementation(record),
    ];
    return {
        text: () => lines.join('\n'),
        restore: () => {
            for (const s of spies) s.mockRestore();
        },
    };
}

describe('Mailer.deliver', () => {
    test('without SMTP, stores the message in the outbox', async () => {
        const db = freshDb();
        const mailer = new Mailer(db, undefined);
        expect(mailer.smtpEnabled).toBe(false);
        expect(await mailer.deliver(message(), T0)).toBe('outbox');
        const rows = db.select().from(mailOutbox).all();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            kind: 'password_reset',
            recipient: 'ada@example.com',
            delivery: 'outbox',
            link: 'http://localhost/reset-password?token=abc',
        });
    });

    test('a sent message is not stored', async () => {
        const db = freshDb();
        const { transport, sent } = okTransport();
        const mailer = new Mailer(db, transport);
        expect(mailer.smtpEnabled).toBe(true);
        expect(await mailer.deliver(message(), T0)).toBe('sent');
        expect(sent).toHaveLength(1);
        expect(sent[0]?.to).toBe('ada@example.com');
        expect(db.select().from(mailOutbox).all()).toHaveLength(0);
    });

    test('a failed send goes to the outbox and logs only the error code', async () => {
        const db = freshDb();
        const mailer = new Mailer(db, {
            send: async () => {
                throw Object.assign(
                    new Error('535 auth failed for smtp-user-xyz s3cret-PASS-xyz'),
                    { code: 'EAUTH', responseCode: 535 }
                );
            },
        });
        const output = captureConsole();
        try {
            expect(await mailer.deliver(message(), T0)).toBe('failed');
        } finally {
            output.restore();
        }
        const rows = db.select().from(mailOutbox).all();
        expect(rows.map((r) => r.delivery)).toEqual(['failed']);
        const text = output.text();
        expect(text).toContain('EAUTH 535');
        expect(text).not.toContain('smtp-user-xyz');
        expect(text).not.toContain('s3cret-PASS-xyz');
        expect(text).not.toContain('ada@example.com');
    });
});

describe('Mailer.enqueue', () => {
    test('delivers in the background; flush waits for it', async () => {
        const db = freshDb();
        const mailer = new Mailer(db, undefined);
        mailer.enqueue(
            message({ expiresAt: new Date(Date.now() + 3600_000) })
        );
        await mailer.flush();
        expect(db.select().from(mailOutbox).all()).toHaveLength(1);
    });
});

describe('Mailer.listOutbox', () => {
    test('lists newest first and drops expired messages', async () => {
        const db = freshDb();
        const mailer = new Mailer(db, undefined);
        await mailer.deliver(
            message({ to: 'old@example.com', expiresAt: new Date(T0.getTime() + 60_000) }),
            T0
        );
        await mailer.deliver(
            message({ to: 'new@example.com', expiresAt: new Date(LATER.getTime() + 3600_000) }),
            new Date(T0.getTime() + 1000)
        );
        expect(mailer.listOutbox(T0).map((m) => m.to)).toEqual([
            'new@example.com',
            'old@example.com',
        ]);
        const later = mailer.listOutbox(LATER);
        expect(later.map((m) => m.to)).toEqual(['new@example.com']);
        expect(later[0]).toMatchObject({
            kind: 'password_reset',
            delivery: 'outbox',
            link: 'http://localhost/reset-password?token=abc',
        });
        expect(db.select().from(mailOutbox).all()).toHaveLength(1);
    });

    test(`keeps only the newest ${OUTBOX_MAX_ROWS} messages`, async () => {
        const db = freshDb();
        const mailer = new Mailer(db, undefined);
        const far = new Date(T0.getTime() + 86_400_000);
        for (let i = 0; i < OUTBOX_MAX_ROWS + 3; i++) {
            await mailer.deliver(
                message({ to: `u${i}@example.com`, expiresAt: far }),
                new Date(T0.getTime() + i)
            );
        }
        const list = mailer.listOutbox(T0);
        expect(list).toHaveLength(OUTBOX_MAX_ROWS);
        expect(list[0]?.to).toBe(`u${OUTBOX_MAX_ROWS + 2}@example.com`);
        expect(list.some((m) => m.to === 'u0@example.com')).toBe(false);
    });
});

test('clearOutbox removes only the matching kind and recipient', async () => {
    const db = freshDb();
    const mailer = new Mailer(db, undefined);
    await mailer.deliver(message(), T0);
    await mailer.deliver(message({ kind: 'invite' }), T0);
    await mailer.deliver(message({ to: 'bob@example.com' }), T0);
    mailer.clearOutbox('password_reset', 'ada@example.com');
    expect(
        mailer
            .listOutbox(T0)
            .map((m) => `${m.kind}:${m.to}`)
            .sort()
    ).toEqual(['invite:ada@example.com', 'password_reset:bob@example.com']);
});

describe('Mailer.verify', () => {
    test('logs only the code when the check fails', async () => {
        const mailer = new Mailer(freshDb(), {
            send: async () => {},
            verify: async () => {
                throw Object.assign(new Error('connect to s3cret-PASS-xyz'), {
                    code: 'ECONNECTION',
                });
            },
        });
        const output = captureConsole();
        try {
            await mailer.verify();
        } finally {
            output.restore();
        }
        expect(output.text()).toBe(
            'SMTP check failed (ECONNECTION); emails will go to the admin outbox until it works.'
        );
    });
});

test('mailFailureCode reads only code and responseCode', () => {
    expect(mailFailureCode(Object.assign(new Error('x'), { code: 'EAUTH', responseCode: 535 }))).toBe('EAUTH 535');
    expect(mailFailureCode(new Error('secret'))).toBe('unknown');
    expect(mailFailureCode('secret')).toBe('unknown');
    expect(mailFailureCode({ code: { nested: 'secret' } })).toBe('unknown');
});
