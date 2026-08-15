import {
    AccountCircle,
    AddCircleOutline,
    Explore,
    Home,
    Login,
} from '@mui/icons-material';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from 'shared/constants';
import { isStudyRoute } from 'shared/utilities/routes';
import { useCreateStudysetAction } from 'hooks/useCreateStudysetAction';
import { BOTTOM_NAV_VALUES, getBottomNavValue } from './bottomNavRoutes';
import { BottomNavPaper } from './NavStyles';

/**
 * Fixed mobile primary navigation (< md / 900px). Visibility is driven by
 * CSS in BottomNavPaper, not useMediaQuery, so this renders unconditionally
 * on non-study routes and simply collapses to nothing on desktop widths.
 *
 * Selection is derived entirely from the URL via getBottomNavValue - there
 * is no onChange - so it can never desync from the current route (back
 * button, RequireAuth redirects, StreakBadge's /profile?tab=... link).
 */
const MobileBottomNav = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const authenticated = authStatus === 'authenticated';
    const { createAndOpen } = useCreateStudysetAction();

    // Study is a full-screen focus surface with its own header; the bar
    // would sit on top of the flip/grading controls and risks an accidental
    // tap abandoning an in-progress session.
    if (isStudyRoute(pathname)) return null;

    const value = getBottomNavValue(pathname);
    const ariaCurrent = (tab: string) =>
        value === tab ? ('page' as const) : undefined;

    const handleCreate = () => {
        if (!authenticated) {
            void navigate(ROUTES.LOGIN, { state: { from: ROUTES.CREATE } });
            return;
        }
        void createAndOpen();
    };

    const actionSx = {
        minWidth: 0,
        px: '0.25rem',
        color: 'text.secondary',
        '&.Mui-selected': {
            color: 'primary.main',
        },
        '& .MuiBottomNavigationAction-label': {
            color: 'text.secondary',
        },
        '&.Mui-selected .MuiBottomNavigationAction-label': {
            // Selected primary.main on background.paper doesn't meet AA
            // contrast for small text; keep the label on text.primary and
            // let the icon carry the primary-color accent.
            color: 'text.primary',
            fontWeight: 600,
        },
    } as const;

    return (
        <BottomNavPaper
            role="navigation"
            elevation={8}
            aria-label={t('nav.primaryNavigation')}
        >
            <BottomNavigation
                value={value}
                showLabels
                sx={{ width: '100%', backgroundColor: 'transparent' }}
            >
                <BottomNavigationAction
                    value={BOTTOM_NAV_VALUES.HOME}
                    component={RouterLink}
                    to="/"
                    label={t('nav.home')}
                    icon={<Home />}
                    aria-current={ariaCurrent(BOTTOM_NAV_VALUES.HOME)}
                    sx={actionSx}
                />
                <BottomNavigationAction
                    value={BOTTOM_NAV_VALUES.EXPLORE}
                    component={RouterLink}
                    to="/explore"
                    label={t('nav.explore')}
                    icon={<Explore />}
                    aria-current={ariaCurrent(BOTTOM_NAV_VALUES.EXPLORE)}
                    sx={actionSx}
                />
                {/* An action, not a destination: stays a real <button>. */}
                <BottomNavigationAction
                    value={BOTTOM_NAV_VALUES.CREATE}
                    onClick={handleCreate}
                    label={t('nav.create')}
                    icon={<AddCircleOutline />}
                    aria-current={ariaCurrent(BOTTOM_NAV_VALUES.CREATE)}
                    sx={actionSx}
                />
                <BottomNavigationAction
                    value={BOTTOM_NAV_VALUES.ACCOUNT}
                    component={RouterLink}
                    to={authenticated ? '/profile' : ROUTES.LOGIN}
                    label={authenticated ? t('nav.profile') : t('nav.login')}
                    icon={authenticated ? <AccountCircle /> : <Login />}
                    aria-current={ariaCurrent(BOTTOM_NAV_VALUES.ACCOUNT)}
                    sx={actionSx}
                />
            </BottomNavigation>
        </BottomNavPaper>
    );
};

export default MobileBottomNav;
