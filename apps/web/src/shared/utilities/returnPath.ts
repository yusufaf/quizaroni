/**
 * Resolves `path` the way the browser will and returns the result only if it
 * stays in the app, so `//host`, `/\host` and `/<tab>/host` (the parser drops
 * tabs and newlines) are caught. The resolved form is returned, not the
 * input, so what was checked is what gets navigated to.
 */
export const toReturnPath = (path: unknown): string | null => {
    if (typeof path !== 'string' || !path.startsWith('/')) return null;
    try {
        const { origin } = window.location;
        const url = new URL(path, origin);
        // `/..//host` stays on this origin but resolves to the path `//host`,
        // which history would read as another origin.
        if (url.origin !== origin || url.pathname.startsWith('//')) {
            return null;
        }
        return url.pathname + url.search + url.hash;
    } catch {
        return null;
    }
};
