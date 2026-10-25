import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';

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

/**
 * Router state doesn't survive the full-page redirect to Logto's hosted
 * page, so the `from` path is stashed for Callback.tsx. Without a safe one,
 * any earlier path is cleared so an abandoned sign-in can't redirect this one.
 */
export const rememberReturnPath = (state: unknown): void => {
    const from = toReturnPath(
        (state as { from?: unknown } | null | undefined)?.from
    );
    if (from) {
        sessionStorage.setItem(POST_SIGN_IN_REDIRECT_KEY, from);
    } else {
        sessionStorage.removeItem(POST_SIGN_IN_REDIRECT_KEY);
    }
};
