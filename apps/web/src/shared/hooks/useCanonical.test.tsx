// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { renderHook } from '@testing-library/react';
import useCanonical from './useCanonical';

const canonical = () =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href ?? null;

describe('useCanonical', () => {
    beforeEach(() => {
        document.head.innerHTML =
            '<link rel="canonical" href="https://quizaroni.yusufaf.dev/" />';
    });

    it.each(['/', '/explore', '/view/abc'])('points %s at itself', (path) => {
        renderHook(() => useCanonical(path));

        expect(canonical()).toBe(`${window.location.origin}${path}`);
    });

    it.each(['/profile', '/login', '/create/abc', '/view/abc/extra', '/nope'])(
        'drops the tag on %s',
        (path) => {
            renderHook(() => useCanonical(path));

            expect(canonical()).toBeNull();
        }
    );

    it('recreates the tag when navigating back to a public route', () => {
        const { rerender } = renderHook(({ path }) => useCanonical(path), {
            initialProps: { path: '/profile' },
        });
        expect(canonical()).toBeNull();

        rerender({ path: '/explore' });

        expect(canonical()).toBe(`${window.location.origin}/explore`);
    });

    it('leaves a noindex set page without a canonical', () => {
        document.head.innerHTML = '<meta name="robots" content="noindex" />';

        renderHook(() => useCanonical('/view/private'));

        expect(canonical()).toBeNull();
    });

    it('still sets a canonical on /explore after leaving a noindex set', () => {
        document.head.innerHTML = '<meta name="robots" content="noindex" />';
        const { rerender } = renderHook(({ path }) => useCanonical(path), {
            initialProps: { path: '/view/private' },
        });

        rerender({ path: '/explore' });

        expect(canonical()).toBe(`${window.location.origin}/explore`);
    });
});
