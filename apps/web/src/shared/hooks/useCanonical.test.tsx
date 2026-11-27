// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { renderHook } from '@testing-library/react';
import useCanonical from './useCanonical';

const SHELL_ORIGIN = 'https://quizaroni.yusufaf.dev';
const ORIGIN = window.location.origin;
const NOINDEX = '<meta name="robots" content="noindex" />';

const canonical = () =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href ?? null;

const navigate = (from: string, to: string) => {
    const { rerender } = renderHook(({ path }) => useCanonical(path), {
        initialProps: { path: from },
    });
    rerender({ path: to });
};

describe('useCanonical', () => {
    beforeEach(() => {
        document.head.innerHTML = `<link rel="canonical" href="${SHELL_ORIGIN}/" />`;
    });

    it('names this instance, not the domain in the shell', () => {
        renderHook(() => useCanonical('/explore'));

        expect(ORIGIN).not.toBe(SHELL_ORIGIN);
        expect(canonical()).toBe(`${ORIGIN}/explore`);
    });

    it.each(['/', '/explore', '/view/abc'])('points %s at itself', (path) => {
        renderHook(() => useCanonical(path));

        expect(canonical()).toBe(`${ORIGIN}${path}`);
    });

    it.each([
        ['/explore/', '/explore'],
        ['/view/abc/', '/view/abc'],
    ])('drops the trailing slash on %s', (path, expected) => {
        renderHook(() => useCanonical(path));

        expect(canonical()).toBe(`${ORIGIN}${expected}`);
    });

    it.each(['/profile', '/login', '/create/abc', '/view/abc/extra', '/nope'])(
        'drops the tag on %s',
        (path) => {
            renderHook(() => useCanonical(path));

            expect(canonical()).toBeNull();
        }
    );

    it('recreates the tag when navigating back to a public route', () => {
        navigate('/profile', '/explore');

        expect(canonical()).toBe(`${ORIGIN}/explore`);
    });

    it('leaves a set served as noindex without a canonical', () => {
        document.head.innerHTML = NOINDEX;

        renderHook(() => useCanonical('/view/private'));

        expect(canonical()).toBeNull();
    });

    // The server's noindex meta stays in the head after SPA navigation, but it
    // only describes the page the server sent.
    it.each(['/explore', '/view/public'])(
        'sets a canonical on %s after leaving a noindex set',
        (to) => {
            document.head.innerHTML = NOINDEX;

            navigate('/view/private', to);

            expect(canonical()).toBe(`${ORIGIN}${to}`);
        }
    );
});
