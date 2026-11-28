// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import html from '../../../index.html?raw';
import { THEME_STORAGE_KEY } from './prefs';
import { normColor, stubMatchMedia } from './themeTestUtils';

const doc = new DOMParser().parseFromString(html, 'text/html');
const code = doc.getElementById('theme-init')?.textContent ?? '';
// Only the markup the browser has parsed when the script runs.
const headBefore = html.slice(
    html.indexOf('<head>') + '<head>'.length,
    html.indexOf('<script id="theme-init"')
);

const run = ({
    stored,
    dark,
    withMeta = true,
}: {
    stored?: unknown;
    dark: boolean;
    withMeta?: boolean;
}) => {
    document.head.innerHTML = withMeta
        ? headBefore
        : headBefore.replace(/<meta\s+name="theme-color"[^>]*>/, '');
    document.documentElement.removeAttribute('style');
    if (stored !== undefined) {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(stored));
    }
    stubMatchMedia(dark);
    // eslint-disable-next-line no-implied-eval -- runs the inline script as the browser would
    new Function(code)();
};

const html$ = () => document.documentElement.style;
const metaContent = () =>
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.content;

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('theme-init script', () => {
    it('runs right after the theme-color meta and before any CSS or JS', () => {
        const script = doc.getElementById('theme-init');
        const meta = doc.querySelector('meta[name="theme-color"]');
        expect(meta?.nextElementSibling).toBe(script);
        const later = [
            doc.querySelector('link[rel="canonical"]'),
            ...doc.querySelectorAll('script[type="module"]'),
            ...doc.querySelectorAll('link[rel="stylesheet"]'),
        ].filter((el): el is Element => el !== null);
        for (const el of later) {
            expect(
                script!.compareDocumentPosition(el) &
                    Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();
        }
    });

    it('paints a cached dark theme', () => {
        run({
            stored: {
                v: 1,
                prefs: { themeMode: 'dark' },
                paint: { dark: { bg: '#010203', bar: '#040506' } },
            },
            dark: false,
        });
        expect(html$().backgroundColor).toBe(normColor('#010203'));
        expect(html$().colorScheme).toBe('dark');
        expect(metaContent()).toBe('#040506');
    });

    it('prefers modeOverride over the saved mode', () => {
        run({
            stored: {
                v: 1,
                prefs: { themeMode: 'dark' },
                modeOverride: 'light',
                paint: { light: { bg: '#0a0b0c', bar: '#0d0e0f' } },
            },
            dark: true,
        });
        expect(html$().colorScheme).toBe('light');
        expect(html$().backgroundColor).toBe(normColor('#0a0b0c'));
    });

    it('falls back to Quizaroni colours without a cache', () => {
        run({ dark: true });
        expect(html$().backgroundColor).toBe(normColor('#121212'));
        expect(metaContent()).toBe('#1e1e1e');
        run({ dark: false });
        expect(html$().backgroundColor).toBe(normColor('#f5f5f7'));
        expect(metaContent()).toBe('#ffffff');
    });

    it('ignores another storage version', () => {
        run({
            stored: {
                v: 2,
                prefs: { themeMode: 'dark' },
                paint: { dark: { bg: '#010203', bar: '#040506' } },
            },
            dark: false,
        });
        expect(html$().colorScheme).toBe('light');
        expect(html$().backgroundColor).toBe(normColor('#f5f5f7'));
    });

    it('creates the theme-color meta when it is missing', () => {
        run({ dark: true, withMeta: false });
        expect(metaContent()).toBe('#1e1e1e');
    });

    it('reads the same storage key as prefs.ts', () => {
        expect(code.includes(THEME_STORAGE_KEY)).toBe(true);
    });
});
