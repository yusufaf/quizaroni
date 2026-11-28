// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { CustomThemeProvider } from './ThemeProvider';
import type { ThemeContextType } from './ThemeContext';
import { useTheme } from './useTheme';
import {
    DEFAULT_THEME_PREFS,
    LEGACY_THEME_STORAGE_KEY,
    readStoredTheme,
    THEME_STORAGE_KEY,
} from './prefs';
import { normColor, stubMatchMedia } from './themeTestUtils';

let ctx: ThemeContextType;

const Probe = () => {
    ctx = useTheme();
    return (
        <span data-testid="probe">
            {ctx.theme}:{ctx.activeThemeId}
        </span>
    );
};

const renderProvider = () =>
    render(
        <CustomThemeProvider>
            <Probe />
        </CustomThemeProvider>
    );

const shown = () => screen.getByTestId('probe').textContent;

const themeColorMeta = () =>
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

beforeEach(() => {
    localStorage.clear();
    themeColorMeta()?.remove();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#2b2b2b';
    document.head.appendChild(meta);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('CustomThemeProvider', () => {
    it('follows the OS in System mode, including a live change', () => {
        const os = stubMatchMedia(false);
        renderProvider();
        expect(shown()).toBe('light:quizaroni-light');
        act(() => os.setDark(true));
        expect(shown()).toBe('dark:quizaroni-dark');
    });

    it('keeps an explicit dark choice across a remount', () => {
        stubMatchMedia(false);
        const { unmount } = renderProvider();
        act(() => ctx.toggleDarkMode());
        expect(shown()).toBe('dark:quizaroni-dark');
        unmount();
        renderProvider();
        expect(shown()).toBe('dark:quizaroni-dark');
    });

    it('clears the override when toggling back to the OS mode', () => {
        stubMatchMedia(false);
        renderProvider();
        act(() => ctx.toggleDarkMode());
        act(() => ctx.toggleDarkMode());
        expect(shown()).toBe('light:quizaroni-light');
        expect(readStoredTheme().modeOverride).toBeNull();
    });

    it('clears the override when the Settings mode changes', () => {
        stubMatchMedia(false);
        renderProvider();
        act(() => ctx.toggleDarkMode());
        act(() => ctx.setThemePrefs({ themeMode: 'light' }));
        expect(ctx.modeOverride).toBeNull();
        expect(shown()).toBe('light:quizaroni-light');
    });

    it('clears an override an OS change makes redundant', () => {
        const os = stubMatchMedia(false);
        renderProvider();
        act(() => ctx.toggleDarkMode());
        act(() => os.setDark(true));
        expect(readStoredTheme().modeOverride).toBeNull();
        act(() => os.setDark(false));
        expect(shown()).toBe('light:quizaroni-light');
    });

    it('clears an override a server merge makes redundant', () => {
        stubMatchMedia(false);
        renderProvider();
        act(() => ctx.toggleDarkMode());
        act(() => ctx.applyServerPrefs({ themeMode: 'dark' }, 'u1'));
        expect(readStoredTheme().modeOverride).toBeNull();
        act(() => ctx.applyServerPrefs({ themeMode: 'light' }, 'u1'));
        expect(shown()).toBe('light:quizaroni-light');
    });

    it('updates the active theme from a storage event', () => {
        stubMatchMedia(false);
        renderProvider();
        localStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({
                v: 1,
                prefs: { ...DEFAULT_THEME_PREFS, themeMode: 'dark' },
            })
        );
        act(() => {
            window.dispatchEvent(
                new StorageEvent('storage', { key: THEME_STORAGE_KEY })
            );
        });
        expect(shown()).toBe('dark:quizaroni-dark');

        localStorage.removeItem(THEME_STORAGE_KEY);
        act(() => {
            window.dispatchEvent(
                new StorageEvent('storage', { key: THEME_STORAGE_KEY })
            );
        });
        expect(shown()).toBe('light:quizaroni-light');
    });

    it('paints the html background, colour scheme and theme-color meta', () => {
        stubMatchMedia(true);
        renderProvider();
        const html = document.documentElement;
        expect(html.style.backgroundColor).toBe(normColor('#121212'));
        expect(html.style.colorScheme).toBe('dark');
        expect(themeColorMeta()?.content).toBe('#1e1e1e');
    });

    it('creates the theme-color meta when it is missing', () => {
        themeColorMeta()?.remove();
        stubMatchMedia(false);
        renderProvider();
        expect(themeColorMeta()?.content).toBe('#ffffff');
    });

    it('removes and ignores the legacy appTheme key', () => {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
        stubMatchMedia(false);
        renderProvider();
        expect(shown()).toBe('light:quizaroni-light');
        expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
    });
});
