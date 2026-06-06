import { Add, Logout as LogoutIcon } from '@mui/icons-material';
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
import { ROUTES, LOADING_ACTIONS } from 'shared/constants';
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
import { signOut } from 'aws-amplify/auth';
import DarkModeToggleButton from './DarkModeToggleButton';
import { useCreateStudyset } from 'state/api/studysetsAPI';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useGlobalStore } from 'state/stores/global';
import StreakBadge from 'shared/components/StreakBadge/StreakBadge';
import { QUERY_PARAMS } from 'shared/constants';

type Props = {};

const NavBar = (props: Props) => {
    const { t } = useTranslation();
    const { isDarkMode, toggleDarkMode, muiTheme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

    const { setAuthenticated, setLoadingAdd, setLoadingRemove } =
        useGlobalStore();

    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const authenticated = authStatus === 'authenticated';

    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { mutateAsync: createStudyset } = useCreateStudyset();

    const handleLogout = async () => {
        try {
            await signOut();
            setAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const displayDropdown = () => {
        setShowDropdown(true);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    const handleCreateStudyset = async () => {
        setLoadingAdd(LOADING_ACTIONS.CREATE_STUDYSET);
        try {
            const response = await createStudyset();
            const { studyset } = response;
            navigate(`/edit/${studyset.studysetUUID}`);
            setLoadingRemove(LOADING_ACTIONS.CREATE_STUDYSET);
        } catch (error) {
            console.error('Error creating studyset:', error);
            setLoadingRemove(LOADING_ACTIONS.CREATE_STUDYSET);
        }
    };

    return (
        <AppBar
            position="static"
            color="inherit"
            elevation={0}
            sx={{
                zIndex: muiTheme.zIndex.drawer + 1,
                borderBottom: `1px solid ${muiTheme.palette.divider}`,
            }}
        >
            <Toolbar>
                <Typography
                    color="primary"
                    sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                    }}
                >
                    Quizaroni
                </Typography>
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
