import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Db } from '../db';
import { FileStore } from '../files/store';
import { type MailTransport, Mailer } from '../mail/mailer';
import { ensureAuthSecret } from '../settings';
import { type AuthConfig, type AuthHandle, createAuth, lazyAuth } from './auth';
import type { SocialConfig } from './social-config';

// Test helpers only.

export function testAuth(
    db: Db,
    o: {
        publicUrl?: string;
        insecureCookies?: boolean;
        mailer?: Mailer;
        files?: FileStore;
        social?: SocialConfig;
        onSignUp?: AuthConfig['onSignUp'];
    } = {}
): AuthHandle {
    const publicUrl = o.publicUrl ?? 'http://localhost';
    const mailer = o.mailer ?? new Mailer(db, undefined);
    const files =
        o.files ??
        new FileStore(mkdtempSync(join(tmpdir(), 'qz-auth-files-')));
    return lazyAuth(() => ({
        publicUrl,
        auth: createAuth({
            db,
            publicUrl,
            secret: ensureAuthSecret(db),
            insecureCookies: o.insecureCookies ?? false,
            mailer,
            files,
            social: o.social ?? {},
            onSignUp: o.onSignUp,
        }),
    }));
}

// Better Auth's memory rate-limit store is shared by the whole process, so
// each test needs its own client IP.
let ipCounter = 0;
// 198.18.0.0/15 (RFC 2544, reserved for testing) holds 131,072 addresses, so the
// whole suite never reuses one; it also stays clear of the TEST-NET addresses the
// client-IP tests write by hand.
export function nextTestIp(): string {
    ipCounter++;
    return `198.${18 + (ipCounter >> 16)}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
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
