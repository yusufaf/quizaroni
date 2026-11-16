import { join, posix } from 'node:path';
import { serveStatic as serveBunStatic } from '@hono/bun';
import type { Context, MiddlewareHandler } from 'hono';
import { serveStatic } from 'hono/serve-static';

/** Where the built web app comes from: a folder on disk, or files embedded in the binary. */
export type WebAssets = {
    /** The app shell (index.html), or null when the web app isn't built. */
    readShell(): Promise<string | null>;
    serveStatic(onFound: (path: string, c: Context) => void): MiddlewareHandler;
};

export function diskWebAssets(dir: string): WebAssets {
    return {
        // Read on every call: tests and rebuilds replace index.html while the server runs.
        readShell: async () => {
            const index = Bun.file(join(dir, 'index.html'));
            return (await index.exists()) ? index.text() : null;
        },
        serveStatic: (onFound) => serveBunStatic({ root: dir, onFound }),
    };
}

/** `files` maps URL paths ('/index.html', '/assets/app-x.js') to paths Bun.file can read. */
export function embeddedWebAssets(
    files: ReadonlyMap<string, string>
): WebAssets {
    const index = files.get('/index.html');
    // Embedded files never change, so the shell is read once (a failed read is retried).
    let shell: Promise<string | null> | undefined;
    return {
        readShell: () =>
            (shell ??=
                index === undefined
                    ? Promise.resolve(null)
                    : Bun.file(index)
                          .text()
                          .catch((err: unknown) => {
                              shell = undefined;
                              throw err;
                          })),
        serveStatic: (onFound) =>
            serveStatic({
                root: '/',
                join: posix.join,
                getContent: async (path) => {
                    const file = files.get(path);
                    return file === undefined ? null : Bun.file(file);
                },
                onFound,
            }),
    };
}
