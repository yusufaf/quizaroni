import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';
import { normalizeEmail, PASSWORD_MAX, PASSWORD_MIN } from '../config';
import type { Db } from '../db';
import { sanitizeLogArg } from '../db/errors';
import { account, session, user, verification } from '../db/schema';
import { claimInvite, findUsableInvite } from '../invites/invites';
import type { Mailer } from '../mail/mailer';
import { passwordResetMessage } from '../mail/messages';
import { getSetting, SETTING } from '../settings';

export const AUTH_BASE_PATH = '/api/auth';
// Better Auth reads the client IP only from this header, which the server
// always strips from the request and sets itself (see routes.ts).
export const CLIENT_IP_HEADER = 'x-quizaroni-client-ip';
export const COOKIE_PREFIX = 'quizaroni';
export const RATE_LIMITS = {
    signIn: { window: 60, max: 10 },
    signUp: { window: 600, max: 5 },
    resetRequest: { window: 900, max: 5 },
    resetPassword: { window: 600, max: 10 },
};
export const RESET_TOKEN_TTL_SECONDS = 3600;
const NAME_MAX = 100;
const SIGN_UP_PATH = '/sign-up/email';

function inviteInvalid(): APIError {
    return APIError.from('FORBIDDEN', {
        code: 'INVITE_INVALID',
        message: 'This invite link is invalid or has expired.',
    });
}

function inviteTokenOf(body: unknown): string {
    const token = (body as { inviteToken?: unknown } | undefined)?.inviteToken;
    return typeof token === 'string' ? token : '';
}

function registrationOpen(db: Db): boolean {
    return getSetting(db, SETTING.registrationMode) === 'open';
}

export type AuthConfig = {
    db: Db;
    publicUrl: string;
    secret: string;
    insecureCookies: boolean;
    mailer: Mailer;
};

// What hashPassword produces today (Bun's argon2id defaults).
export const CURRENT_HASH_PREFIX = '$argon2id$v=19$m=65536,t=2,p=1$';

export function needsRehash(hash: string): boolean {
    return !hash.startsWith(CURRENT_HASH_PREFIX);
}

export function hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'argon2id' });
}

export async function verifyPassword({
    hash,
    password,
}: {
    hash: string;
    password: string;
}): Promise<boolean> {
    try {
        return await Bun.password.verify(password, hash);
    } catch {
        return false;
    }
}

function registrationGate(db: Db) {
    return createAuthMiddleware(async (ctx) => {
        if (ctx.path !== SIGN_UP_PATH) return;
        // Checked before Better Auth looks the email up, so an outsider can't
        // learn which emails have accounts. The invite is claimed later, in
        // the user-create hook, so a failed sign-up doesn't use it up.
        if (!registrationOpen(db)) {
            const token = inviteTokenOf(ctx.body);
            if (!token) {
                throw APIError.from('FORBIDDEN', {
                    code: 'REGISTRATION_CLOSED',
                    message: 'Registration on this server is invite-only.',
                });
            }
            const invite = findUsableInvite(db, token);
            if (!invite) throw inviteInvalid();
            if (
                invite.email !== null &&
                normalizeEmail(String(ctx.body?.email ?? '')) !== invite.email
            ) {
                throw inviteInvalid();
            }
        }
        const name: unknown = ctx.body?.name;
        const trimmed = typeof name === 'string' ? name.trim() : '';
        if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
            throw APIError.from('BAD_REQUEST', {
                code: 'INVALID_NAME',
                message: `Name must be 1-${NAME_MAX} characters.`,
            });
        }
    });
}

/**
 * Verifies a password and, when it matches a hash from an older scheme (Logto's
 * argon2i after an import), stores a current hash. Keyed by the old hash, so a
 * concurrent password change is never overwritten. A failed upgrade only logs.
 */
export function verifyAndUpgrade(
    db: Db
): (i: { hash: string; password: string }) => Promise<boolean> {
    return async ({ hash, password }) => {
        if (!(await verifyPassword({ hash, password }))) return false;
        if (!needsRehash(hash)) return true;
        try {
            const next = await hashPassword(password);
            db.update(account)
                .set({ password: next, updatedAt: new Date() })
                .where(
                    and(
                        eq(account.providerId, 'credential'),
                        eq(account.password, hash)
                    )
                )
                .run();
        } catch (err) {
            console.error(
                '[auth] Could not upgrade a password hash:',
                sanitizeLogArg(err)
            );
        }
        return true;
    };
}

const authLogger = {
    level: 'error' as const,
    log: (
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        ...args: unknown[]
    ) => {
        const write = level === 'debug' ? console.log : console[level];
        write(`[auth] ${message}`, ...args.map(sanitizeLogArg));
    },
};

export function createAuth(cfg: AuthConfig) {
    return betterAuth({
        appName: 'Quizaroni',
        baseURL: cfg.publicUrl,
        basePath: AUTH_BASE_PATH,
        // Both forms, so BETTER_AUTH_SECRET(S) and AUTH_SECRET are ignored.
        secret: cfg.secret,
        secrets: [{ version: 1, value: cfg.secret }],
        trustedOrigins: [cfg.publicUrl],
        database: drizzleAdapter(cfg.db, {
            provider: 'sqlite',
            schema: { user, account, session, verification },
        }),
        telemetry: { enabled: false },
        logger: authLogger,
        // Rethrow errors Better Auth doesn't handle, so app.onError logs them
        // sanitized instead of better-call printing the raw query and its params.
        onAPIError: { throw: true },
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
            minPasswordLength: PASSWORD_MIN,
            maxPasswordLength: PASSWORD_MAX,
            password: { hash: hashPassword, verify: verifyAndUpgrade(cfg.db) },
            resetPasswordTokenExpiresIn: RESET_TOKEN_TTL_SECONDS,
            revokeSessionsOnPasswordReset: true,
            // Queued, not awaited, so a known email answers as fast as an
            // unknown one, and a request over the per-recipient limit
            // (applied by the mailer) as fast as any other.
            sendResetPassword: async ({ user: u, token }) => {
                cfg.mailer.enqueue(
                    passwordResetMessage({
                        to: u.email,
                        name: u.name,
                        link: `${cfg.publicUrl}/reset-password?token=${encodeURIComponent(token)}`,
                        publicUrl: cfg.publicUrl,
                        expiresAt: new Date(
                            Date.now() + RESET_TOKEN_TTL_SECONDS * 1000
                        ),
                    })
                );
            },
            onPasswordReset: async ({ user: u }) => {
                cfg.mailer.clearOutbox('password_reset', u.email);
            },
        },
        verification: { storeIdentifier: 'hashed' },
        user: {
            additionalFields: {
                role: {
                    type: 'string',
                    required: false,
                    input: false,
                    defaultValue: 'user',
                },
            },
        },
        databaseHooks: {
            user: {
                create: {
                    // Sign-up stores any client-sent `image`; avatars come with
                    // the profile work.
                    before: async (u, ctx) => {
                        // Fail closed: on an invite-only server, only email
                        // sign-up with an invite it can claim creates users.
                        if (
                            !registrationOpen(cfg.db) &&
                            (ctx?.path !== SIGN_UP_PATH ||
                                !claimInvite(cfg.db, inviteTokenOf(ctx.body)))
                        ) {
                            throw inviteInvalid();
                        }
                        return {
                            data: { ...u, name: u.name.trim(), image: null },
                        };
                    },
                },
            },
        },
        advanced: {
            cookiePrefix: COOKIE_PREFIX,
            useSecureCookies: !cfg.insecureCookies,
            // Better Auth skips this check when NODE_ENV=test unless it is pinned.
            disableOriginCheck: false,
            ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
            database: { generateId: 'uuid' },
        },
        rateLimit: {
            // Otherwise on only when NODE_ENV=production.
            enabled: true,
            storage: 'memory',
            customRules: {
                '/sign-in/email': RATE_LIMITS.signIn,
                '/sign-up/email': RATE_LIMITS.signUp,
                '/request-password-reset': RATE_LIMITS.resetRequest,
                '/reset-password': RATE_LIMITS.resetPassword,
            },
        },
        hooks: { before: registrationGate(cfg.db) },
    });
}

export type Auth = ReturnType<typeof createAuth>;

// Read by Better Auth on every request, so a stray value would widen trust.
const IGNORED_AUTH_ENV = ['BETTER_AUTH_TRUSTED_ORIGINS'] as const;

export function scrubAuthEnv(env: Record<string, string | undefined>): string[] {
    const removed: string[] = [];
    for (const name of IGNORED_AUTH_ENV) {
        if (env[name]) {
            delete env[name];
            removed.push(name);
        }
    }
    return removed;
}

export type AuthContext = { auth: Auth; publicUrl: string };
export type AuthHandle = () => AuthContext;

// The public URL can be final only after the wizard runs or the port is bound,
// so the instance is built on first use.
export function lazyAuth(make: () => AuthContext): AuthHandle {
    let context: AuthContext | undefined;
    return () => (context ??= make());
}
