import type { MiddlewareHandler } from 'hono';
import type { AuthHandle } from '../auth/auth';

export type SessionEnv = { Variables: { userId: string } };

export function noStore(): MiddlewareHandler {
    return async (c, next) => {
        c.header('Cache-Control', 'no-store');
        await next();
    };
}

// The user is always the session's; no body field ever picks one.
export function requireSession(
    auth: AuthHandle
): MiddlewareHandler<SessionEnv> {
    return async (c, next) => {
        const found = await auth().auth.api.getSession({
            headers: c.req.raw.headers,
        });
        if (!found) return c.json({ message: 'Unauthorized' }, 401);
        c.set('userId', found.user.id);
        return next();
    };
}

// File reads may be anonymous (published sets); every other method still
// needs a session, so a route added later is closed by default.
export function sessionUnlessRead(
    auth: AuthHandle
): MiddlewareHandler<SessionEnv> {
    const required = requireSession(auth);
    return async (c, next) => {
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
            return required(c, next);
        }
        const found = await auth().auth.api.getSession({
            headers: c.req.raw.headers,
        });
        if (found) c.set('userId', found.user.id);
        return next();
    };
}
