import type { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { serveStatic } from '@hono/bun';
import { type Context, Hono } from 'hono';

export type AppDeps = { sqlite: Database; webDir: string; version: string };

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

export function createApp({ sqlite, webDir, version }: AppDeps): Hono {
    const app = new Hono();

    app.get('/api/health', (c) => {
        try {
            sqlite.query('SELECT 1').get();
            return c.json({ status: 'ok', version });
        } catch {
            return c.json({ status: 'error', version }, 503);
        }
    });

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
        console.error(err);
        if (isApiPath(c.req.path))
            return c.json({ message: 'Internal server error' }, 500);
        return c.text('Internal server error', 500);
    });

    return app;
}
