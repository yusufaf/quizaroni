import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { type AuthHandle, CLIENT_IP_HEADER } from './auth';
import { pickClientIp, socketIp } from './client-ip';

// Only the endpoints this slice needs; everything else under /api/auth falls
// through to the /api 404 so endpoints like update-user stay unreachable.
export const AUTH_ROUTES = [
    ['GET', '/get-session'],
    ['POST', '/sign-in/email'],
    ['POST', '/sign-up/email'],
    ['POST', '/sign-out'],
] as const;

const BODY_LIMIT_BYTES = 16 * 1024;

type Env = { Variables: { clientIp: string | undefined } };

export function authRoutes(deps: {
    auth: AuthHandle;
    trustProxy: boolean;
}): Hono<Env> {
    const routes = new Hono<Env>();
    let warnedUntrustedProxy = false;

    // Before bodyLimit: it may replace c.req.raw, and Bun's requestIP returns
    // null for a copied Request.
    routes.use('*', async (c, next) => {
        const forwardedFor = c.req.header('x-forwarded-for');
        if (!deps.trustProxy && forwardedFor && !warnedUntrustedProxy) {
            warnedUntrustedProxy = true;
            console.warn(
                'A request carried X-Forwarded-For, but QZ_TRUST_PROXY is off, so all clients behind that proxy share one sign-in rate limit. Set QZ_TRUST_PROXY=true if a reverse proxy fronts Quizaroni.'
            );
        }
        c.set(
            'clientIp',
            pickClientIp(socketIp(c), forwardedFor, deps.trustProxy)
        );
        return next();
    });

    routes.post(
        '*',
        bodyLimit({
            maxSize: BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        })
    );

    for (const [method, path] of AUTH_ROUTES) {
        routes.on(method, path, (c) => {
            const { auth, publicUrl } = deps.auth();
            const headers = new Headers(c.req.raw.headers);
            headers.delete(CLIENT_IP_HEADER);
            const ip = c.get('clientIp');
            if (ip) headers.set(CLIENT_IP_HEADER, ip);
            // The API guard accepted this as same-origin; without the rewrite
            // Better Auth would compare against the internal request URL.
            if (
                headers.get('origin') === 'null' &&
                headers.get('sec-fetch-site') === 'same-origin'
            ) {
                headers.set('origin', publicUrl);
            }
            return auth.handler(new Request(c.req.raw, { headers }));
        });
    }

    return routes;
}
