import { Create, Logout as LogoutIcon } from '@mui/icons-material';
import {
    AppBar,
    Button,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material/';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileDropdown from 'views/Profile/ProfileDropdown';
import { useTheme } from 'theme/useTheme';
import { ROUTES } from 'shared/constants';
import NavDrawer from './NavDrawer';
import {
    AuthenticationButton,
    LoginButtonsContainer,
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

type Props = {};

const NavBar = (props: Props) => {
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
    const { mutate: createStudyset } = useCreateStudyset();

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${muiTheme.palette.text.primary}`,
    });

    const handleLogout = async () => {
        try {
            const result = await signOut();
            console.log('Sign-In Result = ', result);

            setAuthenticated(false);
        } catch (error) {
            console.log('error signing out: ', error);
        }
    };

    const displayDropdown = () => {
        setShowDropdown(true);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    const handleCreateStudyset = async () => {
        setLoadingAdd('CREATE_STUDYSET');
        createStudyset({})
            .unwrap()
            .then((response) => {
                const { studyset } = response;
                navigate(`/edit/${studyset.studysetUUID}`);
                setLoadingRemove('CREATE_STUDYSET');
            });
    };

    return (
        <AppBar
            position="static"
            color="inherit"
            sx={{
                zIndex: muiTheme.zIndex.drawer + 1,
            }}
        >
            <Toolbar>
                {/*
                    TODO: Revisit what to do with logo 
                    <AppLogo
                        src={QuizaroniLogo}
                        alt="Quizaroni logo"
                    /> */}
                <Typography color="primary" variant="h4">
                    Quizaroni
                </Typography>
                {isMobile && <NavDrawer />}
                {!isMobile && (
                    <NavItemsContainer>
                        <NavLinksContainer>
                            <StyledNavLink to="/" style={activeLinkStyle}>
                                Home
                            </StyledNavLink>
                            <StyledNavLink
                                to="/explore"
                                style={activeLinkStyle}
                            >
                                Explore
                            </StyledNavLink>
                            <Button
                                variant="contained"
                                onClick={handleCreateStudyset}
                                size="large"
                                startIcon={<Create />}
                            >
                                Create Study Set
                            </Button>
                        </NavLinksContainer>
                        <NavRightActions>
                            {authenticated ? (
                                <>
                                    <AuthenticationButton
                                        variant="text"
                                        onClick={() => handleLogout()}
                                        startIcon={<LogoutIcon />}
                                    >
                                        Logout
                                    </AuthenticationButton>
                                </>
                            ) : (
                                <LoginButtonsContainer>
                                    <AuthenticationButton
                                        variant="outlined"
                                        onClick={() => navigate(ROUTES.LOGIN)}
                                    >
                                        Log in
                                    </AuthenticationButton>
                                    <AuthenticationButton
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.SIGNUP)}
                                    >
                                        Sign up
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
