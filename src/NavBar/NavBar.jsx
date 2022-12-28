import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom";
import { AppBar, Button, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material/';
import { getAuth, signOut } from "firebase/auth";
import {
    Logout as LogoutIcon
} from "@mui/icons-material"
import { useTheme } from "../theme/useTheme";
import NavDrawer from "./NavDrawer";
import ProfileDropdown from "../Profile/ProfileDropdown";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";
import {
    SUCCESS,
    ROUTES
} from "../utilities/constants";
import {
    AppLogo,
    AuthenticationButton,
    LoginButtonsContainer,
    NavItemsContainer,
    StyledNavLink,
    StyledDarkModeIcon,
    StyledLightModeIcon,
    StyledAccountIcon,
    StyledArrowIcon,
    ProfileIconContainer,
    NavRightActions,
    NavLinksContainer,
} from "./NavStyles";
import { useDispatch } from "react-redux";
import { setAlert } from "src/slices/globalSlice";

const NavBar = props => {
    // TODO: Change to use redux slice
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const auth = getAuth();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${theme.palette.text.primary}`
    });

    const displayLogoutAlert = (type) => {
        const showLogoutToast = true;
        const logoutSuccessAlert = {
            message: "Successfully logged out :)",
            open: showLogoutToast,
            type: SUCCESS,
        };
        dispatch(setAlert(logoutSuccessAlert));
        return;
    }

    /**
    * Handles logging out a user, using Firebase's provided method signOut()
    */
    const handleLogout = () => {
        console.log("Current user authentication object = ", auth);

        /* Sign out the currently logged in user */
        signOut(auth).then(() => {
            // Sign-out successful.
            console.log("User successfully signed out");

            /* TODO: Don't necessarily have to remove the object entirely, just reset its value to null? */
            if (localStorage.getItem("userInfo") !== null) {
                localStorage.removeItem("userInfo");
            }
            setUserAuthState(null);
        }).catch((error) => {
            console.error("Something bad happened = ", error);
        });
    }

    const displayDropdown = () => {
        setShowDropdown(true);
    }

    const closeDropdown = () => {
        setShowDropdown(false);
    }

    return (
        <AppBar position="static" color="inherit">
            <Toolbar>
                {/*
                    TODO: Revisit what to do with logo 
                    <AppLogo
                        src={QuizaroniLogo}
                        alt="Quizaroni logo"
                    /> */
                }
                <Typography
                    color="primary"
                    variant="h4"
                >
                    Quizaroni
                </Typography>
                {isMobile &&
                    <NavDrawer />
                }
                {!isMobile &&
                    <NavItemsContainer>
                        <NavLinksContainer>
                            <StyledNavLink to="/" style={activeLinkStyle}>
                                Home
                            </StyledNavLink>
                            <StyledNavLink
                                to="/create"
                                style={activeLinkStyle}
                            >
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
                            {userAuthState ?
                                <AuthenticationButton
                                    variant="text"
                                    onClick={() => handleLogout()}
                                    startIcon={<LogoutIcon />}
                                >
                                    Logout
                                </AuthenticationButton>
                                :
                                <LoginButtonsContainer>
                                    <AuthenticationButton
                                        variant="outlined"
                                        onClick={() => navigate(ROUTES.LOGIN)}
                                    >
                                        Log in
                                    </AuthenticationButton>
                                    <AuthenticationButton
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.LOGIN)}
                                    >
                                        Sign up
                                    </AuthenticationButton>
                                </LoginButtonsContainer>
                            }
                            <Tooltip title="Toggle dark mode">
                                <IconButton onClick={toggleDarkMode}>
                                    {isDarkMode ? <StyledLightModeIcon /> : <StyledDarkModeIcon />}
                                </IconButton>
                            </Tooltip>
                            {userAuthState &&
                                (
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
                                )
                            }
                        </NavRightActions>
                    </NavItemsContainer>
                }
            </Toolbar>
        </AppBar>
    );
}

export default NavBar;