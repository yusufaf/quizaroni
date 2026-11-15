import { and, desc, eq, lte, notInArray } from 'drizzle-orm';
import type { Db } from '../db';
import { describeDbError } from '../db/errors';
import { mailOutbox } from '../db/schema';

export type MailKind = 'password_reset' | 'invite';

export type MailMessage = {
    kind: MailKind;
    to: string;
    subject: string;
    text: string;
    link: string;
    expiresAt: Date;
};

export type Delivery = 'sent' | 'outbox' | 'failed';

export type MailTransport = {
    send(m: { to: string; subject: string; text: string }): Promise<void>;
    verify?(): Promise<void>;
};

export type OutboxView = {
    id: string;
    kind: MailKind;
    to: string;
    subject: string;
    link: string;
    delivery: 'outbox' | 'failed';
    createdAt: string;
    expiresAt: string;
};

export const OUTBOX_MAX_ROWS = 500;

// Only the error's code fields: SMTP error messages can echo the server's
// reply, which may include the user name.
export function mailFailureCode(err: unknown): string {
    const { code, responseCode } = (
        typeof err === 'object' && err !== null ? err : {}
    ) as { code?: unknown; responseCode?: unknown };
    const name = typeof code === 'string' && code ? code : 'unknown';
    return typeof responseCode === 'number' ||
        (typeof responseCode === 'string' && responseCode)
        ? `${name} ${responseCode}`
        : name;
}

export class Mailer {
    private readonly pending = new Set<Promise<unknown>>();

    constructor(
        private readonly db: Db,
        private readonly transport: MailTransport | undefined
    ) {}

    get smtpEnabled(): boolean {
        return this.transport !== undefined;
    }

    async deliver(msg: MailMessage, now = new Date()): Promise<Delivery> {
        // Only the newest reset link per person is kept, so reset requests
        // can't flood the outbox and push invite links out of it.
        const replacesEarlier = msg.kind === 'password_reset';
        if (!this.transport) {
            if (replacesEarlier) this.clearOutbox(msg.kind, msg.to);
            this.store(msg, 'outbox', now);
            return 'outbox';
        }
        try {
            await this.transport.send({
                to: msg.to,
                subject: msg.subject,
                text: msg.text,
            });
            if (replacesEarlier) this.clearOutbox(msg.kind, msg.to);
            return 'sent';
        } catch (err) {
            console.error(
                `Could not send ${msg.kind} email over SMTP (${mailFailureCode(err)}); it is in the admin outbox.`
            );
            if (replacesEarlier) this.clearOutbox(msg.kind, msg.to);
            this.store(msg, 'failed', now);
            return 'failed';
        }
    }

    // Fire-and-forget, so the caller's response time doesn't depend on SMTP.
    enqueue(msg: MailMessage): void {
        const job = this.deliver(msg).finally(() => this.pending.delete(job));
        this.pending.add(job);
    }

    async flush(): Promise<void> {
        while (this.pending.size > 0) {
            await Promise.allSettled([...this.pending]);
        }
    }

    async verify(): Promise<void> {
        if (!this.transport?.verify) return;
        try {
            await this.transport.verify();
            console.log('SMTP connection verified.');
        } catch (err) {
            console.error(
                `SMTP check failed (${mailFailureCode(err)}); emails will go to the admin outbox until it works.`
            );
        }
    }

    listOutbox(now = new Date()): OutboxView[] {
        this.prune(now);
        return this.db
            .select()
            .from(mailOutbox)
            .orderBy(desc(mailOutbox.createdAt))
            .all()
            .map((r) => ({
                id: r.id,
                kind: r.kind,
                to: r.recipient,
                subject: r.subject,
                link: r.link,
                delivery: r.delivery,
                createdAt: r.createdAt.toISOString(),
                expiresAt: r.expiresAt.toISOString(),
            }));
    }

    clearOutbox(kind: MailKind, recipient: string): void {
        this.db
            .delete(mailOutbox)
            .where(
                and(
                    eq(mailOutbox.kind, kind),
                    eq(mailOutbox.recipient, recipient)
                )
            )
            .run();
    }

    private store(
        msg: MailMessage,
        delivery: 'outbox' | 'failed',
        now: Date
    ): void {
        try {
            this.db
                .insert(mailOutbox)
                .values({
                    id: crypto.randomUUID(),
                    kind: msg.kind,
                    recipient: msg.to,
                    subject: msg.subject,
                    body: msg.text,
                    link: msg.link,
                    delivery,
                    createdAt: now,
                    expiresAt: msg.expiresAt,
                })
                .run();
            this.prune(now);
        } catch (err) {
            console.error(
                `Could not store ${msg.kind} email in the outbox: ${describeDbError(err)}`
            );
        }
    }

    private prune(now: Date): void {
        this.db.delete(mailOutbox).where(lte(mailOutbox.expiresAt, now)).run();
        const keep = this.db
            .select({ id: mailOutbox.id })
            .from(mailOutbox)
            .orderBy(desc(mailOutbox.createdAt), desc(mailOutbox.id))
            .limit(OUTBOX_MAX_ROWS);
        this.db.delete(mailOutbox).where(notInArray(mailOutbox.id, keep)).run();
    }
}
