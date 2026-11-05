import type { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { serveStatic } from '@hono/bun';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { AUTH_BASE_PATH, type AuthHandle } from './auth/auth';
import { authRoutes } from './auth/routes';
import type { Db } from './db';
import { sanitizeLogArg } from './db/errors';
import { apiRequestGuard } from './http/api-guard';
import { setupRoutes } from './setup/routes';
import type { SetupGate } from './setup/setup';
import { userRoutes } from './users/routes';

export type AppDeps = {
    sqlite: Database;
    db: Db;
    webDir: string;
    version: string;
    setup: SetupGate;
    configuredPublicUrl?: string;
    auth: AuthHandle;
    trustProxy: boolean;
};

const REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';

function setCacheHeaders(_path: string, c: Context): void {
    c.header(
        'Cache-Control',
        c.req.path.startsWith('/assets/') ? IMMUTABLE : REVALIDATE
    );
}

function isApiPath(path: string): boolean {
    return path === '/api' || path.startsWith('/api/');
}

// Until an admin exists, everything except /api/health and /setup leads to the
// wizard. API clients get JSON, since they can't follow a redirect to a page.
function setupGuard(gate: SetupGate): MiddlewareHandler {
    return async (c, next) => {
        if (c.req.path === '/setup' || gate.isComplete()) return next();
        c.header('Cache-Control', 'no-store');
        if (isApiPath(c.req.path)) {
            return c.json({ message: 'Setup required', setupUrl: '/setup' }, 503);
        }
        return c.redirect('/setup', 302);
    };
}

export function createApp({
    sqlite,
    db,
    webDir,
    version,
    setup,
    configuredPublicUrl,
    auth,
    trustProxy,
}: AppDeps): Hono {
    const app = new Hono();

    app.get('/api/health', (c) => {
        try {
            sqlite.query('SELECT 1').get();
            return c.json({ status: 'ok', version });
        } catch {
            return c.json({ status: 'error', version }, 503);
        }
    });

    app.use('*', setupGuard(setup));

    app.route('/setup', setupRoutes({ db, gate: setup, configuredPublicUrl }));

    app.use('/api/*', apiRequestGuard(() => auth().publicUrl));

    app.route(AUTH_BASE_PATH, authRoutes({ auth, trustProxy }));

    app.route('/api/users', userRoutes({ db, auth }));

    app.all('/api/*', (c) => c.json({ message: 'Not found' }, 404));

    app.use('*', serveStatic({ root: webDir, onFound: setCacheHeaders }));

    app.get('*', async (c) => {
        const lastSegment = c.req.path.slice(c.req.path.lastIndexOf('/') + 1);
        if (lastSegment.includes('.')) return c.notFound();
        const index = Bun.file(join(webDir, 'index.html'));
        if (!(await index.exists())) return c.text('Web app not built', 503);
        return c.body(await index.text(), 200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': REVALIDATE,
        });
    });

    app.onError((err, c) => {
        console.error(sanitizeLogArg(err));
        if (isApiPath(c.req.path))
            return c.json({ message: 'Internal server error' }, 500);
        return c.text('Internal server error', 500);
    });

    return app;
}
