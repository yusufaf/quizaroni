import type { Context, MiddlewareHandler } from 'hono';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_WARNED_ORIGINS = 50;

function blocked(c: Context): Response {
    c.header('Cache-Control', 'no-store');
    return c.json({ message: 'Cross-origin request blocked' }, 403);
}

// CSRF protection for every state-changing /api route. A browser always sends
// Origin or Sec-Fetch-Site on a cross-site POST; a client sending neither has
// no ambient cookies to abuse. Requiring JSON also forces a CORS preflight,
// which the server never grants.
export function apiRequestGuard(trustedOrigin: () => string): MiddlewareHandler {
    const warned = new Set<string>();

    const warnOnce = (method: string, origin: string, publicUrl: string) => {
        if (warned.has(origin) || warned.size >= MAX_WARNED_ORIGINS) return;
        warned.add(origin);
        console.warn(
            `Blocked a ${method} from origin ${origin}; the public URL is ${publicUrl}. Set QZ_PUBLIC_URL if users reach Quizaroni at ${origin}.`
        );
    };

    return async (c, next) => {
        if (SAFE_METHODS.has(c.req.method)) return next();

        const origin = c.req.header('origin');
        const fetchSite = c.req.header('sec-fetch-site');
        if (origin !== undefined) {
            const publicUrl = trustedOrigin();
            // Browsers send Origin: null on a same-origin POST under
            // Referrer-Policy: no-referrer; page script can't set Sec-Fetch-Site.
            const sameOriginNull =
                origin === 'null' && fetchSite === 'same-origin';
            if (origin !== publicUrl && !sameOriginNull) {
                warnOnce(c.req.method, origin, publicUrl);
                return blocked(c);
            }
        } else if (fetchSite !== undefined && fetchSite !== 'same-origin') {
            return blocked(c);
        }

        const mediaType = (c.req.header('content-type') ?? '')
            .split(';')[0]!
            .trim()
            .toLowerCase();
        if (mediaType !== 'application/json') {
            return c.json(
                { message: 'Content-Type must be application/json' },
                415
            );
        }
        return next();
    };
}
