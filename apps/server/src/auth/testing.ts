import type { Db } from '../db';
import { type MailTransport, Mailer } from '../mail/mailer';
import { ensureAuthSecret } from '../settings';
import { type AuthHandle, createAuth, lazyAuth } from './auth';

// Test helpers only.

export function testAuth(
    db: Db,
    o: { publicUrl?: string; insecureCookies?: boolean; mailer?: Mailer } = {}
): AuthHandle {
    const publicUrl = o.publicUrl ?? 'http://localhost';
    const mailer = o.mailer ?? new Mailer(db, undefined);
    return lazyAuth(() => ({
        publicUrl,
        auth: createAuth({
            db,
            publicUrl,
            secret: ensureAuthSecret(db),
            insecureCookies: o.insecureCookies ?? false,
            mailer,
        }),
    }));
}

// Better Auth's memory rate-limit store is shared by the whole process, so
// each test needs its own client IP.
let ipCounter = 0;
export function nextTestIp(): string {
    ipCounter++;
    const block = ipCounter <= 250 ? '203.0.113' : '198.51.100';
    return `${block}.${(ipCounter % 250) + 1}`;
}

// A Bun server env for app.request(). Like Bun, it knows the address only for
// the Request it received, not for a copy made later.
export function ipEnv(ip: string) {
    let first: Request | undefined;
    return {
        requestIP: (req: Request) => {
            first ??= req;
            return req === first
                ? { address: ip, family: 'IPv4', port: 40000 }
                : null;
        },
    };
}

export function fakeTransport(): {
    transport: MailTransport;
    sent: { to: string; subject: string; text: string }[];
} {
    const sent: { to: string; subject: string; text: string }[] = [];
    return {
        sent,
        transport: {
            send: async (m) => {
                sent.push(m);
            },
        },
    };
}
