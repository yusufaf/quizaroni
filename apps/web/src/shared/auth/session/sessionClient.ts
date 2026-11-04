// A small client for the self-host server's Better Auth endpoints. Kept
// hand-written so the server library stays out of the web bundle.

export type SessionUser = { id: string; email: string; name: string };

export class AuthRequestError extends Error {
    status: number;
    code?: string;
    retryAfter?: number;

    constructor(
        status: number,
        message: string,
        code?: string,
        retryAfter?: number
    ) {
        super(message);
        this.name = 'AuthRequestError';
        this.status = status;
        this.code = code;
        this.retryAfter = retryAfter;
    }
}

const AUTH_BASE = '/api/auth';

const parseRetryAfter = (value: string | null): number | undefined => {
    if (value === null || value.trim() === '') return undefined;
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : undefined;
};

const authFetch = async (
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<unknown> => {
    const res = await fetch(`${AUTH_BASE}${path}`, {
        method: init.method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    let body: unknown = null;
    try {
        body = await res.json();
    } catch {
        // An empty or non-JSON body; the status says enough.
    }
    if (!res.ok) {
        const { code, message } = (body ?? {}) as {
            code?: unknown;
            message?: unknown;
        };
        throw new AuthRequestError(
            res.status,
            typeof message === 'string' ? message : res.statusText,
            typeof code === 'string' ? code : undefined,
            parseRetryAfter(res.headers.get('x-retry-after'))
        );
    }
    return body;
};

const toSessionUser = (u: unknown): SessionUser => {
    const { id, email, name } = u as Record<string, unknown>;
    return { id: String(id), email: String(email), name: String(name ?? '') };
};

const userOf = (body: unknown): unknown =>
    (body as { user?: unknown } | null)?.user;

export const getSession = async (): Promise<SessionUser | null> => {
    const user = userOf(await authFetch('/get-session', { method: 'GET' }));
    return user ? toSessionUser(user) : null;
};

export const signInEmail = async (input: {
    email: string;
    password: string;
}): Promise<SessionUser> =>
    toSessionUser(
        userOf(
            await authFetch('/sign-in/email', { method: 'POST', body: input })
        )
    );

export const signUpEmail = async (input: {
    name: string;
    email: string;
    password: string;
}): Promise<SessionUser> =>
    toSessionUser(
        userOf(
            await authFetch('/sign-up/email', { method: 'POST', body: input })
        )
    );

export const signOutSession = async (): Promise<void> => {
    await authFetch('/sign-out', { method: 'POST', body: {} });
};
