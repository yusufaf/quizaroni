// @vitest-environment jsdom
import { describe, expect, it } from 'vite-plus/test';
import { toReturnPath } from './returnPath';

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
