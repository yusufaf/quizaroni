// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { CustomThemeProvider } from 'shared/theme/ThemeProvider';
import {
    defaultStoredTheme,
    readStoredTheme,
    writeStoredTheme,
} from 'shared/theme/prefs';
import { stubMatchMedia } from 'shared/theme/themeTestUtils';
import ThemeModeControl from './ThemeModeControl';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const renderControl = () =>
    render(
        <CustomThemeProvider>
            <ThemeModeControl />
        </CustomThemeProvider>
    );

const button = (key: string) => screen.getByRole('button', { name: key });

beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('ThemeModeControl', () => {
    it('reflects the saved theme mode', () => {
        renderControl();
        expect(
            button('profile.themeModeSystem').getAttribute('aria-pressed')
        ).toBe('true');
        expect(
            button('profile.themeModeDark').getAttribute('aria-pressed')
        ).toBe('false');
    });

    it('clears the header override when System is chosen again', () => {
        writeStoredTheme({ ...defaultStoredTheme(), modeOverride: 'dark' });
        renderControl();
        fireEvent.click(button('profile.themeModeSystem'));
        expect(readStoredTheme().modeOverride).toBeNull();
    });

    it('stores Dark and clears the override', () => {
        writeStoredTheme({ ...defaultStoredTheme(), modeOverride: 'light' });
        renderControl();
        fireEvent.click(button('profile.themeModeDark'));
        const stored = readStoredTheme();
        expect(stored.prefs.themeMode).toBe('dark');
        expect(stored.modeOverride).toBeNull();
    });
});
