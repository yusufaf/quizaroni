import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';

/**
 * An in-app path to return to after sign-in. `//host` and `/\host` are
 * rejected because browsers read both as another origin.
 */
export const isSafeReturnPath = (path: unknown): path is string =>
    typeof path === 'string' &&
    path.startsWith('/') &&
    path[1] !== '/' &&
    path[1] !== '\\';

/**
 * Router state doesn't survive the full-page redirect to Logto's hosted
 * page, so the `from` path is stashed for Callback.tsx. Without a safe one,
 * any earlier path is cleared so an abandoned sign-in can't redirect this one.
 */
export const rememberReturnPath = (state: unknown): void => {
    const from = (state as { from?: unknown } | null | undefined)?.from;
    if (isSafeReturnPath(from)) {
        sessionStorage.setItem(POST_SIGN_IN_REDIRECT_KEY, from);
    } else {
        sessionStorage.removeItem(POST_SIGN_IN_REDIRECT_KEY);
    }
};
