// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NavDrawer from './NavDrawer';

const theme = createTheme();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// react-router-dom is mocked wholesale (not via vi.importActual) because
// this repo's react-router-dom@7 currently pulls in an internal
// react-router@8 dependency that requires a React 19 export (useOptimistic)
// not present in this app's React 18 - loading the real package throws in
// the jsdom test environment.
const navigateSpy = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateSpy,
    NavLink: ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children: React.ReactNode;
    }) => (
        <a href={to} {...rest}>
            {children}
        </a>
    ),
    // NavStyles.tsx (imported by NavDrawer) also styles Link even though
    // NavDrawer doesn't render it - stub it too since the module import
    // itself is evaluated.
    Link: ({
        to,
        children,
        ...rest
    }: {
        to: string;
        children: React.ReactNode;
    }) => (
        <a href={to} {...rest}>
            {children}
        </a>
    ),
}));

let authStatus: 'authenticated' | 'unauthenticated' = 'authenticated';
vi.mock('@aws-amplify/ui-react', () => ({
    useAuthenticator: () => ({ authStatus }),
}));

const handleLogout = vi.fn();
vi.mock('hooks/useLogout', () => ({
    useLogout: () => handleLogout,
}));

// DarkModeToggleButton reads theme/useTheme, which throws outside
// CustomThemeProvider - stub it rather than wrapping the whole tree in the
// real provider, which the drawer's other pieces don't need.
vi.mock('theme/useTheme', () => ({
    useTheme: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

const setup = () =>
    render(
        <ThemeProvider theme={theme}>
            <NavDrawer />
        </ThemeProvider>
    );

const openDrawer = () => {
    fireEvent.click(screen.getByRole('button', { name: 'nav.openMenu' }));
};

describe('NavDrawer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authStatus = 'authenticated';
    });

    it('the hamburger has an accessible name and toggles aria-expanded', () => {
        setup();
        const hamburger = screen.getByRole('button', { name: 'nav.openMenu' });
        expect(hamburger.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(hamburger);
        expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    });

    it('shows Logout and no auth buttons when authenticated', () => {
        setup();
        openDrawer();
        expect(screen.getByText('nav.logout')).toBeTruthy();
        expect(screen.queryByText('nav.login')).toBeNull();
        expect(screen.queryByText('nav.signup')).toBeNull();
    });

    it('shows Login and Sign up, and no Logout, when logged out', () => {
        authStatus = 'unauthenticated';
        setup();
        openDrawer();
        expect(screen.getByText('nav.login')).toBeTruthy();
        expect(screen.getByText('nav.signup')).toBeTruthy();
        expect(screen.queryByText('nav.logout')).toBeNull();
    });

    it('calls the logout hook when Logout is clicked', () => {
        setup();
        openDrawer();
        fireEvent.click(screen.getByText('nav.logout'));
        expect(handleLogout).toHaveBeenCalledTimes(1);
    });
});
