import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { PASSWORD_MAX, PASSWORD_MIN } from '../config';
import type { Db } from '../db';
import { sanitizeLogArg } from '../db/errors';
import { account, session, user, verification } from '../db/schema';
import { getSetting, SETTING } from '../settings';

export const AUTH_BASE_PATH = '/api/auth';
// Better Auth reads the client IP only from this header, which the server
// always strips from the request and sets itself (see routes.ts).
export const CLIENT_IP_HEADER = 'x-quizaroni-client-ip';
export const COOKIE_PREFIX = 'quizaroni';
export const RATE_LIMITS = {
    signIn: { window: 60, max: 10 },
    signUp: { window: 600, max: 5 },
};
const NAME_MAX = 100;

export type AuthConfig = {
    db: Db;
    publicUrl: string;
    secret: string;
    insecureCookies: boolean;
};

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
        if (ctx.path !== '/sign-up/email') return;
        if (getSetting(db, SETTING.registrationMode) !== 'open') {
            throw APIError.from('FORBIDDEN', {
                code: 'REGISTRATION_CLOSED',
                message: 'Registration on this server is invite-only.',
            });
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
            password: { hash: hashPassword, verify: verifyPassword },
        },
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
                    before: async (u) => ({
                        data: { ...u, name: u.name.trim(), image: null },
                    }),
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
