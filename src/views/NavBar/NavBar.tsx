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
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import { useNavigate } from 'react-router-dom';
import {
    selectAuthenticated,
    setAuthenticated,
} from 'state/slices/globalSlice';
import ProfileDropdown from 'views/Profile/ProfileDropdown';
import { useTheme } from 'theme/useTheme';
import { ROUTES } from 'utilities/constants';
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
import { useCreateStudysetMutation } from 'state/api/studysetsAPI';

type Props = {};

const NavBar = (props: Props) => {
    const { isDarkMode, toggleDarkMode, muiTheme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

    const dispatch = useAppDispatch();
    const authenticated = useAppSelector(selectAuthenticated);

    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [createStudyset] = useCreateStudysetMutation();

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${muiTheme.palette.text.primary}`,
    });

    const handleLogout = async () => {
        try {
            const result = await signOut();
            console.log('Sign-In Result = ', result);

            dispatch(setAuthenticated(false));
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
        // @ts-ignore
        const { data } = await createStudyset({});
        const { studyset } = data;
        navigate(`/create/${studyset.studysetUUID}`);
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
