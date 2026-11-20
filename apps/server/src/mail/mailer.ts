import { and, count, desc, eq, lte, notInArray } from 'drizzle-orm';
import type { Db } from '../db';
import { describeDbError } from '../db/errors';
import { mailOutbox, resetEmailLog } from '../db/schema';

export type MailKind = 'password_reset' | 'invite';

export type MailMessage = {
    kind: MailKind;
    to: string;
    subject: string;
    text: string;
    link: string;
    expiresAt: Date;
};

export type Delivery = 'sent' | 'outbox' | 'failed' | 'throttled';

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

// The window matches the reset link lifetime (RESET_TOKEN_TTL_SECONDS), so
// someone who is throttled still has a working link from an earlier email.
export const RESET_EMAIL_LIMIT = { max: 3, windowMs: 60 * 60 * 1000 };

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
        if (
            msg.kind === 'password_reset' &&
            !this.resetAllowed(msg.to, now)
        ) {
            return 'throttled';
        }
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

    // Started after the request's own work, so the response doesn't depend
    // on whether this message is sent, stored or throttled.
    enqueue(msg: MailMessage): void {
        const job = new Promise<void>((resolve) => setImmediate(resolve))
            .then(() => this.deliver(msg))
            .finally(() => this.pending.delete(job));
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

    // Fails open: a reset email that can't be counted is still sent.
    private resetAllowed(recipient: string, now: Date): boolean {
        try {
            return this.claimResetSlot(recipient, now);
        } catch (err) {
            console.error(
                `Could not check the reset email limit (${describeDbError(err)}); sending anyway.`
            );
            return true;
        }
    }

    // A sliding log: at most RESET_EMAIL_LIMIT.max sends in any window. Every
    // statement is synchronous, so concurrent requests can't both take the
    // last slot.
    private claimResetSlot(recipient: string, now: Date): boolean {
        const cutoff = new Date(now.getTime() - RESET_EMAIL_LIMIT.windowMs);
        this.db
            .delete(resetEmailLog)
            .where(lte(resetEmailLog.createdAt, cutoff))
            .run();
        const recent =
            this.db
                .select({ n: count() })
                .from(resetEmailLog)
                .where(eq(resetEmailLog.recipient, recipient))
                .get()?.n ?? 0;
        if (recent >= RESET_EMAIL_LIMIT.max) return false;
        this.db
            .insert(resetEmailLog)
            .values({ id: crypto.randomUUID(), recipient, createdAt: now })
            .run();
        return true;
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
