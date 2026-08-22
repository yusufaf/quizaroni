import { Add, Logout as LogoutIcon } from '@mui/icons-material';
import logoUrl from '../../resources/logo.png';
import {
    AppBar,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material/';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ProfileDropdown from 'views/Profile/ProfileDropdown';
import { useTheme } from 'theme/useTheme';
import { ROUTES } from 'shared/constants';
import { SyncStatusIndicator } from 'state/local';
import NavDrawer from './NavDrawer';
import {
    AuthenticationButton,
    CreateStudySetButton,
    LoginButtonsContainer,
    LogoutIconButton,
    NavItemsContainer,
    NavLinksContainer,
    NavRightActions,
    ProfileIconContainer,
    StyledAccountIcon,
    StyledNavLink,
} from './NavStyles';
import DarkModeToggleButton from './DarkModeToggleButton';
import { useLogto } from '@logto/react';
import StreakBadge from 'shared/components/StreakBadge/StreakBadge';
import { QUERY_PARAMS } from 'shared/constants';
import { useCreateStudysetAction } from 'hooks/useCreateStudysetAction';
import { useLogout } from 'hooks/useLogout';

type Props = {};

const NavBar = (props: Props) => {
    const { t } = useTranslation();
    const { isDarkMode, toggleDarkMode, muiTheme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

    const { isAuthenticated: authenticated } = useLogto();

    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { createAndOpen: handleCreateStudyset } = useCreateStudysetAction();
    const handleLogout = useLogout();

    const displayDropdown = () => {
        setShowDropdown(true);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    return (
        <AppBar
            position="static"
            color="inherit"
            elevation={0}
            sx={{
                zIndex: muiTheme.zIndex.drawer + 1,
                borderBottom: `1px solid ${muiTheme.palette.divider}`,
                paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
        >
            <Toolbar>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <img
                        src={logoUrl}
                        alt="Quizaroni Logo"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                        }}
                    />
                    <Typography
                        color="primary"
                        sx={{
                            fontSize: '2rem',
                            fontWeight: 700,
                        }}
                    >
                        Quizaroni
                    </Typography>
                </div>
                {isMobile && <NavDrawer />}
                {!isMobile && (
                    <NavItemsContainer>
                        <NavLinksContainer>
                            <StyledNavLink to="/">
                                {t('nav.home')}
                            </StyledNavLink>
                            <StyledNavLink to="/explore">
                                {t('nav.explore')}
                            </StyledNavLink>
                            <CreateStudySetButton
                                variant="contained"
                                onClick={handleCreateStudyset}
                                startIcon={<Add />}
                            >
                                {t('nav.createStudySet')}
                            </CreateStudySetButton>
                        </NavLinksContainer>
                        <NavRightActions>
                            <SyncStatusIndicator />
                            {authenticated && (
                                <StreakBadge
                                    onClick={() =>
                                        navigate(
                                            `/profile?${QUERY_PARAMS.PROFILE_TAB}=Achievements`
                                        )
                                    }
                                />
                            )}
                            {authenticated ? (
                                <Tooltip title={t('nav.logout')}>
                                    <LogoutIconButton
                                        onClick={() => handleLogout()}
                                    >
                                        <LogoutIcon />
                                    </LogoutIconButton>
                                </Tooltip>
                            ) : (
                                <LoginButtonsContainer>
                                    <AuthenticationButton
                                        variant="outlined"
                                        onClick={() => navigate(ROUTES.LOGIN)}
                                    >
                                        {t('nav.login')}
                                    </AuthenticationButton>
                                    <AuthenticationButton
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.SIGNUP)}
                                    >
                                        {t('nav.signup')}
                                    </AuthenticationButton>
                                </LoginButtonsContainer>
                            )}
                            <DarkModeToggleButton />
                            {authenticated && (
                                <>
                                    <ProfileIconContainer
                                        onClick={displayDropdown}
                                        ref={dropdownRef}
                                    >
                                        <StyledAccountIcon />
                                    </ProfileIconContainer>
                                    <ProfileDropdown
                                        showDropdown={showDropdown}
                                        dropdownRef={dropdownRef}
                                        onClose={closeDropdown}
                                    />
                                </>
                            )}
                        </NavRightActions>
                    </NavItemsContainer>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;
