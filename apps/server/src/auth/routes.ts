import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Db } from '../db';
import { type AuthHandle, CLIENT_IP_HEADER, registrationOpen } from './auth';
import { pickClientIp, socketIp } from './client-ip';
import type { SocialProviderId } from './social-config';

// Only the endpoints the web app uses; everything else under /api/auth falls
// through to the /api 404 so endpoints like update-user stay unreachable.
// Reset links point at the web app, so Better Auth's GET /reset-password/:token
// redirect isn't needed. The social routes are added per configured provider.
export const AUTH_ROUTES = [
    ['GET', '/get-session'],
    ['POST', '/sign-in/email'],
    ['POST', '/sign-up/email'],
    ['POST', '/sign-out'],
    ['POST', '/request-password-reset'],
    ['POST', '/reset-password'],
    ['POST', '/delete-user'],
] as const;

const BODY_LIMIT_BYTES = 16 * 1024;

type Env = { Variables: { clientIp: string | undefined } };

function socialRoutes(
    providers: readonly SocialProviderId[]
): readonly (readonly [string, string])[] {
    if (providers.length === 0) return [];
    return [
        ['POST', '/sign-in/social'],
        ...providers.map((id) => ['GET', `/callback/${id}`] as const),
    ];
}

export function authRoutes(deps: {
    db: Db;
    auth: AuthHandle;
    trustProxy: boolean;
    social?: readonly SocialProviderId[];
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

    // What the sign-in and sign-up pages need to decide which buttons to show.
    routes.get('/providers', (c) => {
        c.header('Cache-Control', 'no-store');
        return c.json({
            providers: [...(deps.social ?? [])],
            registrationOpen: registrationOpen(deps.db),
        });
    });

    for (const [method, path] of [
        ...AUTH_ROUTES,
        ...socialRoutes(deps.social ?? []),
    ]) {
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
