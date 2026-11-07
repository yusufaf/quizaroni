import type { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { serveStatic } from '@hono/bun';
import { and, desc, eq } from 'drizzle-orm';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { AUTH_BASE_PATH, type AuthHandle } from './auth/auth';
import { authRoutes } from './auth/routes';
import type { Db } from './db';
import { sanitizeLogArg } from './db/errors';
import { studyset } from './db/schema';
import { fileRoutes } from './files/routes';
import { FileStore } from './files/store';
import { UploadRegistry } from './files/uploads';
import { apiRequestGuard } from './http/api-guard';
import { publicRoutes } from './public/routes';
import { toPublicStudyset } from './public/views';
import {
    rebrandShell,
    renderSetShell,
    robotsTxt,
    SITEMAP_MAX_SETS,
    sitemapXml,
} from './seo/pages';
import { setupRoutes } from './setup/routes';
import type { SetupGate } from './setup/setup';
import { LISTED } from './studysets/gate';
import { studysetRoutes } from './studysets/routes';
import { isStudysetUUID } from './studysets/updates';
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
    files: FileStore;
    uploads?: UploadRegistry;
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
    files,
    uploads = new UploadRegistry(files),
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

    app.route('/api/users', userRoutes({ db, auth, files }));

    app.route('/api/studysets', studysetRoutes({ db, auth, files }));

    app.route('/api/files', fileRoutes({ db, auth, files, uploads }));

    app.route('/api/public', publicRoutes({ db }));

    app.all('/api/*', (c) => c.json({ message: 'Not found' }, 404));

    const readShell = async (): Promise<string | null> => {
        const index = Bun.file(join(webDir, 'index.html'));
        return (await index.exists()) ? index.text() : null;
    };
    const sendShell = (
        c: Context,
        html: string,
        extraHeaders: Record<string, string> = {}
    ) =>
        c.body(html, 200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': REVALIDATE,
            ...extraHeaders,
        });
    // The shell names the hosted instance; every page names this one.
    const serveShell = async (c: Context) => {
        const html = await readShell();
        if (html === null) return c.text('Web app not built', 503);
        return sendShell(c, rebrandShell(html, auth().publicUrl));
    };

    app.get('/robots.txt', (c) =>
        c.body(robotsTxt(auth().publicUrl), 200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': REVALIDATE,
        })
    );

    app.get('/sitemap.xml', (c) => {
        const sets = db
            .select({
                studysetUUID: studyset.studysetUUID,
                updatedAt: studyset.updatedAt,
            })
            .from(studyset)
            .where(LISTED)
            .orderBy(desc(studyset.publishedAt), desc(studyset.studysetUUID))
            .limit(SITEMAP_MAX_SETS)
            .all();
        return c.body(sitemapXml(auth().publicUrl, sets), 200, {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': REVALIDATE,
        });
    });

    app.get('/', serveShell);
    app.get('/index.html', serveShell);

    // Link previews and search snippets for a listed set; anything else gets
    // a noindex shell that says nothing about the set.
    app.get('/view/:studysetUUID', async (c) => {
        const html = await readShell();
        if (html === null) return c.text('Web app not built', 503);
        const id = c.req.param('studysetUUID');
        const row = isStudysetUUID(id)
            ? db
                  .select()
                  .from(studyset)
                  .where(and(eq(studyset.studysetUUID, id), LISTED))
                  .get()
            : undefined;
        const origin = auth().publicUrl;
        const page = renderSetShell(
            rebrandShell(html, origin),
            row ? toPublicStudyset(row) : null,
            { origin, studysetUUID: id }
        );
        return sendShell(
            c,
            page.html,
            page.indexable ? {} : { 'X-Robots-Tag': 'noindex' }
        );
    });

    app.use('*', serveStatic({ root: webDir, onFound: setCacheHeaders }));

    app.get('*', async (c) => {
        const lastSegment = c.req.path.slice(c.req.path.lastIndexOf('/') + 1);
        if (lastSegment.includes('.')) return c.notFound();
        return serveShell(c);
    });

    app.onError((err, c) => {
        console.error(sanitizeLogArg(err));
        if (isApiPath(c.req.path))
            return c.json({ message: 'Internal server error' }, 500);
        return c.text('Internal server error', 500);
    });

    return app;
}
