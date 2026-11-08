import { afterEach, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { join } from 'node:path';
import { createRouteHarness, type RouteHarness } from './testing/route-harness';

// Every `${BASE_API_URL}/…` the web client builds must reach a real route
// here, not the /api/* catch-all 404 (#264). Paths only: the client's HTTP
// method can't be read off the template literal.
const WEB_SRC = join(import.meta.dir, '../../web/src');
const CALL = /`\$\{BASE_API_URL\}(\/[^`?]*)/g;

let current: RouteHarness | undefined;

afterEach(() => {
    current?.close();
    current = undefined;
});

async function clientApiPaths(): Promise<string[]> {
    const paths = new Set<string>();
    const glob = new Glob('**/*.{ts,tsx}');
    for await (const file of glob.scan({ cwd: WEB_SRC })) {
        if (/\.test\.tsx?$/.test(file)) continue;
        const source = await Bun.file(join(WEB_SRC, file)).text();
        for (const match of source.matchAll(CALL)) {
            paths.add(`/api${match[1]!.replace(/\$\{[^}]*\}/g, 'x')}`);
        }
    }
    return [...paths].sort();
}

function routePatterns(app: RouteHarness['app']): RegExp[] {
    return app.routes
        .map((route) => route.path)
        .filter((path) => path.startsWith('/api/') && !path.includes('*'))
        .map((path) => new RegExp(`^${path.replace(/:[^/]+/g, '[^/]+')}$`));
}

test('the web client calls at least the core API paths', async () => {
    const paths = await clientApiPaths();
    expect(paths.length).toBeGreaterThan(20);
    expect(paths).toContain('/api/studysets/update-studyset');
});

test('every API path the web client calls has a server route', async () => {
    current = await createRouteHarness();
    const patterns = routePatterns(current.app);
    const missing = (await clientApiPaths()).filter(
        (path) => !patterns.some((pattern) => pattern.test(path))
    );
    expect(missing).toEqual([]);
});
