// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MobileBottomNav from './MobileBottomNav';

const theme = createTheme();

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// react-router-dom is mocked wholesale (not via vi.importActual) because
// this repo's react-router-dom@7 currently pulls in an internal
// react-router@8 dependency that requires a React 19 export (useOptimistic)
// not present in this app's React 18 - loading the real package throws in
// the jsdom test environment. `Link` renders as a plain anchor so
// getByRole('link') / aria-current / href assertions still work; `to` is
// forwarded verbatim since the component only ever passes string paths.
let pathname = '/';
const navigateSpy = vi.fn();
vi.mock('react-router-dom', () => {
    const FakeLink = ({
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
    );
    return {
        useLocation: () => ({ pathname }),
        useNavigate: () => navigateSpy,
        // NavStyles.tsx (imported transitively via BottomNavPaper) also
        // styles NavLink for the desktop nav - stub it too even though this
        // component doesn't render it, since the module import is evaluated.
        Link: FakeLink,
        NavLink: FakeLink,
    };
});

let authStatus: 'authenticated' | 'unauthenticated' = 'authenticated';
vi.mock('@aws-amplify/ui-react', () => ({
    useAuthenticator: () => ({ authStatus }),
}));

const createAndOpen = vi.fn();
vi.mock('hooks/useCreateStudysetAction', () => ({
    useCreateStudysetAction: () => ({ createAndOpen }),
}));

const setup = (path: string) => {
    pathname = path;
    return render(
        <ThemeProvider theme={theme}>
            <MobileBottomNav />
        </ThemeProvider>
    );
};

describe('MobileBottomNav', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authStatus = 'authenticated';
    });

    it('renders the primary-navigation landmark', () => {
        setup('/');
        expect(
            screen.getByRole('navigation', { name: 'nav.primaryNavigation' })
        ).toBeTruthy();
    });

    it('shows Profile when authenticated', () => {
        setup('/');
        expect(screen.getByRole('link', { name: 'nav.profile' })).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'nav.login' })).toBeNull();
    });

    it('shows Login (not Profile) when logged out', () => {
        authStatus = 'unauthenticated';
        setup('/');
        const loginLink = screen.getByRole('link', { name: 'nav.login' });
        expect(loginLink).toBeTruthy();
        expect(loginLink.getAttribute('href')).toBe('/login');
        expect(screen.queryByRole('link', { name: 'nav.profile' })).toBeNull();
    });

    it('marks only the active tab with aria-current', () => {
        setup('/explore');
        expect(
            screen
                .getByRole('link', { name: 'nav.explore' })
                .getAttribute('aria-current')
        ).toBe('page');
        expect(
            screen
                .getByRole('link', { name: 'nav.home' })
                .getAttribute('aria-current')
        ).toBeNull();
    });

    it('Create fires the create action when authenticated (no redirect)', () => {
        setup('/explore');
        screen.getByRole('button', { name: 'nav.create' }).click();
        expect(createAndOpen).toHaveBeenCalledTimes(1);
        expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('Create redirects to login without calling the hook when logged out', () => {
        authStatus = 'unauthenticated';
        setup('/explore');
        screen.getByRole('button', { name: 'nav.create' }).click();
        expect(createAndOpen).not.toHaveBeenCalled();
        expect(navigateSpy).toHaveBeenCalledWith('/login', {
            state: { from: '/create' },
        });
    });

    it('renders nothing on study routes', () => {
        const { container } = setup('/study/abc/flashcards');
        expect(
            container.querySelector('[aria-label="nav.primaryNavigation"]')
        ).toBeNull();
    });
});
