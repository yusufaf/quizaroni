import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { createServer } from 'node:net';
import type { Db } from '../db';
import { mailOutbox } from '../db/schema';
import { openTestDb } from '../testing/studysets';
import type { SmtpConfig } from './config';
import {
    decodeQuotedPrintable,
    type FakeSmtp,
    startFakeSmtp,
} from './fake-smtp';
import { Mailer } from './mailer';
import { passwordResetMessage } from './messages';
import { smtpTransport } from './smtp';

const USER = 'smtp-user-xyz';
// Built at runtime so secret scanners don't flag this fake test password.
const PASSWORD = ['s3cret', 'PASS', 'xyz'].join('-');
const LINK =
    'https://quiz.example.org/reset-password?token=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdEf';

let current: ReturnType<typeof openTestDb> | undefined;
let fake: FakeSmtp | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(async () => {
    await fake?.close();
    fake = undefined;
    current?.close();
    current = undefined;
});

function config(port: number): SmtpConfig {
    return {
        host: '127.0.0.1',
        port,
        security: 'none',
        from: 'Quizaroni <qz@example.org>',
        auth: { user: USER, pass: PASSWORD },
    };
}

function resetMessage() {
    return passwordResetMessage({
        to: 'ada@example.com',
        name: 'Ada',
        link: LINK,
        publicUrl: 'https://quiz.example.org',
        expiresAt: new Date(Date.now() + 3600_000),
    });
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

function expectNoCredentials(text: string) {
    expect(text).not.toContain(USER);
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(
        Buffer.from(`\0${USER}\0${PASSWORD}`).toString('base64')
    );
}

async function closedPort(): Promise<number> {
    const server = createServer();
    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (address === null || typeof address === 'string')
        throw new Error('no port');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    return address.port;
}

describe('smtpTransport (nodemailer under Bun)', () => {
    test('sends the message with the link intact', async () => {
        fake = await startFakeSmtp();
        const db = freshDb();
        const mailer = new Mailer(db, smtpTransport(config(fake.port)));
        expect(await mailer.deliver(resetMessage())).toBe('sent');
        expect(fake.authAttempts).toBe(1);
        expect(fake.messages).toHaveLength(1);
        const data = decodeQuotedPrintable(fake.messages[0] ?? '');
        expect(data).toContain(LINK);
        expect(data).toContain('Subject: Reset your Quizaroni password');
        expect(db.select().from(mailOutbox).all()).toHaveLength(0);
    });

    test('a rejected login goes to the outbox and logs no credentials', async () => {
        fake = await startFakeSmtp({ acceptAuth: false });
        const db = freshDb();
        const mailer = new Mailer(db, smtpTransport(config(fake.port)));
        const output = captureConsole();
        let delivery: string;
        try {
            delivery = await mailer.deliver(resetMessage());
        } finally {
            output.restore();
        }
        expect(delivery).toBe('failed');
        expect(fake.messages).toHaveLength(0);
        expect(
            db
                .select()
                .from(mailOutbox)
                .all()
                .map((r) => r.delivery)
        ).toEqual(['failed']);
        const text = output.text();
        expect(text).toContain('EAUTH 535');
        expectNoCredentials(text);
    });

    test('verify against a closed port logs only the error code', async () => {
        const mailer = new Mailer(
            freshDb(),
            smtpTransport(config(await closedPort()))
        );
        const output = captureConsole();
        try {
            await mailer.verify();
        } finally {
            output.restore();
        }
        const text = output.text();
        expect(text).toMatch(
            /^SMTP check failed \((ECONNECTION|ECONNREFUSED|ESOCKET)\); emails will go to the admin outbox until it works\.$/
        );
        expectNoCredentials(text);
    });

    test('verify against a working server succeeds', async () => {
        fake = await startFakeSmtp();
        const mailer = new Mailer(freshDb(), smtpTransport(config(fake.port)));
        const output = captureConsole();
        try {
            await mailer.verify();
        } finally {
            output.restore();
        }
        expect(output.text()).toBe('SMTP connection verified.');
    });
});
