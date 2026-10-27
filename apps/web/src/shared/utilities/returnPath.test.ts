// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';
import { rememberReturnPath, toReturnPath } from './returnPath';

const stored = () => sessionStorage.getItem(POST_SIGN_IN_REDIRECT_KEY);

beforeEach(() => {
    sessionStorage.clear();
});

describe('toReturnPath', () => {
    it.each(['/', '/explore', '/explore?subject=biology', '/view/abc'])(
        'keeps the in-app path %p',
        (path) => {
            expect(toReturnPath(path)).toBe(path);
        }
    );

    it('returns the path as the browser resolves it', () => {
        expect(toReturnPath('/explore/../view/abc?x=1')).toBe('/view/abc?x=1');
    });

    it.each([
        '//evil.com',
        '/\\evil.com',
        // URL parsing drops tabs and newlines, leaving //evil.com.
        '/\t/evil.com',
        '/\n/evil.com',
        // Same origin, but resolves to the path //evil.com, which history
        // reads as another origin.
        '/..//evil.com',
        '/./\\evil.com',
        'https://evil.com',
        'explore',
        '',
        42,
        null,
        undefined,
    ])('rejects %p', (path) => {
        expect(toReturnPath(path)).toBeNull();
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
        { from: '/..//evil.com' },
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
