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
