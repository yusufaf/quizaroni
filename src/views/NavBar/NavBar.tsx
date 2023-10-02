import { GitHub, LinkedIn, Logout as LogoutIcon } from "@mui/icons-material";
import {
    AppBar,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material/";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    selectAuthenticated,
    setAlert,
    setAuthenticated,
} from "state/slices/global";
import ProfileDropdown from "views/Profile/ProfileDropdown";
import { useTheme } from "theme/useTheme";
import { ROUTES, SUCCESS } from "utilities/constants";
import NavDrawer from "./NavDrawer";
import {
    AuthenticationButton,
    LoginButtonsContainer,
    NavItemsContainer,
    NavLinksContainer,
    NavRightActions,
    ProfileIconContainer,
    StyledAccountIcon,
    StyledArrowIcon,
    StyledDarkModeIcon,
    StyledLightModeIcon,
    StyledNavLink,
} from "./NavStyles";
import { Auth } from "aws-amplify";

type Props = {};

const NavBar = (props: Props) => {
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);

    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? "0.2rem solid orange" : "none",
        color: `${theme.palette.text.primary}`,
    });

    const handleLogout = async () => {
        try {
            const result = await Auth.signOut();
            console.log("Sign-In Result = ", result);

            dispatch(setAuthenticated(false));
        } catch (error) {
            console.log("error signing out: ", error);
        }
    };

    const displayDropdown = () => {
        setShowDropdown(true);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    return (
        <AppBar position="static" color="inherit">
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
                            <StyledNavLink to="/create" style={activeLinkStyle}>
                                Create
                            </StyledNavLink>
                            <StyledNavLink
                                to="/explore"
                                style={activeLinkStyle}
                            >
                                Explore
                            </StyledNavLink>
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
                                    {/* TODO: Move these buttons to revamped footer */}
                                    <IconButton 
                                        href="https://github.com/yusufaf"
                                        target="_blank"
                                    >
                                        <GitHub />
                                    </IconButton>
                                    <IconButton
                                        href="https://www.linkedin.com/in/yusuf-afzal/"
                                        target="_blank"
                                    >
                                        <LinkedIn />
                                    </IconButton>
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
                            <Tooltip title="Toggle dark mode">
                                <IconButton onClick={toggleDarkMode}>
                                    {isDarkMode ? (
                                        <StyledLightModeIcon />
                                    ) : (
                                        <StyledDarkModeIcon />
                                    )}
                                </IconButton>
                            </Tooltip>
                            {authenticated && (
                                <>
                                    <ProfileIconContainer
                                        onClick={displayDropdown}
                                        ref={dropdownRef}
                                    >
                                        <StyledAccountIcon />
                                        <StyledArrowIcon />
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
