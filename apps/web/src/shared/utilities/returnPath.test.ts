// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';
import { isSafeReturnPath, rememberReturnPath } from './returnPath';

const stored = () => sessionStorage.getItem(POST_SIGN_IN_REDIRECT_KEY);

beforeEach(() => {
    sessionStorage.clear();
});

describe('isSafeReturnPath', () => {
    it.each(['/', '/explore', '/explore?subject=biology', '/view/abc'])(
        'accepts the in-app path %p',
        (path) => {
            expect(isSafeReturnPath(path)).toBe(true);
        }
    );

    it.each([
        '//evil.com',
        '/\\evil.com',
        'https://evil.com',
        'explore',
        '',
        42,
        null,
        undefined,
    ])('rejects %p', (path) => {
        expect(isSafeReturnPath(path)).toBe(false);
    });
});

describe('rememberReturnPath', () => {
    it('stores a safe from path', () => {
        rememberReturnPath({ from: '/explore?subject=biology' });
        expect(stored()).toBe('/explore?subject=biology');
    });

    it.each([
        { from: '//evil.com' },
        { from: '/\\evil.com' },
        { from: 'https://evil.com' },
        { from: 'explore' },
        { from: '' },
        { from: 42 },
        {},
        null,
        undefined,
    ])('stores nothing for %p', (state) => {
        rememberReturnPath(state);
        expect(stored()).toBeNull();
    });

    // A path left by an abandoned sign-in mustn't hijack a later one.
    it.each([null, { from: '//evil.com' }])(
        'clears an earlier path for %p',
        (state) => {
            sessionStorage.setItem(POST_SIGN_IN_REDIRECT_KEY, '/old');
            rememberReturnPath(state);
            expect(stored()).toBeNull();
        }
    );
});
