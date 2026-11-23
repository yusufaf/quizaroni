import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { sanitizeLogArg } from '../db/errors';
import { account } from '../db/schema';
import type { Mailer } from './mailer';

export type SignupMethod = 'google' | 'github' | 'email' | 'invite' | 'other';

export type SignupEvent = {
    userId: string;
    name: string;
    email: string;
    method: SignupMethod;
};

export const SIGNUP_NOTICE_SUBJECT = 'New sign-up on Quizaroni';
export const SIGNUP_NOTICE_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 };

const METHOD_LABELS: Record<SignupMethod, string> = {
    google: 'Google',
    github: 'GitHub',
    email: 'email and password',
    invite: 'email and password (invite link)',
    other: 'another method',
};

// The name is whatever the new user typed or their provider sent, so it can't
// be allowed to add lines or headers to the mail.
function oneLine(value: string): string {
    return value.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ');
}

export function signupNoticeMessage(o: {
    to: string;
    name: string;
    email: string;
    method: SignupMethod;
    at: Date;
    publicUrl: string;
}): { to: string; subject: string; text: string } {
    return {
        to: o.to,
        subject: SIGNUP_NOTICE_SUBJECT,
        text: [
            `A new account was created on the Quizaroni server at ${o.publicUrl}.`,
            '',
            `Name: ${oneLine(o.name)}`,
            `Email: ${oneLine(o.email)}`,
            `Signed up with: ${METHOD_LABELS[o.method]}`,
            `Time: ${o.at.toISOString()}`,
            '',
            `Admin page: ${o.publicUrl}/admin`,
            '',
            'You get this email because QZ_SIGNUP_NOTIFY_EMAIL is set on this server.',
        ].join('\n'),
    };
}

// Better Auth's drizzle adapter runs without a real transaction, so its
// user-created hook can fire for a sign-up whose account insert then fails.
// The check runs after the request's own writes, and only a user with an
// account row gets a notice.
export function createSignupNotifier(o: {
    mailer: Mailer;
    to: string;
    publicUrl: string;
    db: Db;
    limit?: { max: number; windowMs: number };
    now?: () => Date;
}): (event: SignupEvent) => void {
    const { max, windowMs } = o.limit ?? SIGNUP_NOTICE_LIMIT;
    const now = o.now ?? (() => new Date());
    let sentAt: number[] = [];
    let warnedAt = Number.NEGATIVE_INFINITY;

    const hasAccount = (userId: string): boolean =>
        o.db
            .select({ id: account.id })
            .from(account)
            .where(eq(account.userId, userId))
            .get() !== undefined;

    const claimSlot = (at: Date): boolean => {
        const t = at.getTime();
        sentAt = sentAt.filter((s) => t - s < windowMs);
        if (sentAt.length < max) {
            sentAt.push(t);
            return true;
        }
        if (t - warnedAt >= windowMs) {
            warnedAt = t;
            console.warn(
                `Sign-up notices are capped at ${max} per hour; dropping the rest until the window passes.`
            );
        }
        return false;
    };

    return (event) => {
        setImmediate(() => {
            try {
                if (!hasAccount(event.userId)) return;
                const at = now();
                if (!claimSlot(at)) return;
                o.mailer.notify({
                    ...signupNoticeMessage({
                        to: o.to,
                        name: event.name,
                        email: event.email,
                        method: event.method,
                        at,
                        publicUrl: o.publicUrl,
                    }),
                    label: 'sign-up notice',
                });
            } catch (err) {
                console.error(
                    'Could not prepare a sign-up notice:',
                    sanitizeLogArg(err)
                );
            }
        });
    };
}
