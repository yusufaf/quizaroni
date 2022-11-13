import { useState, useEffect, useRef } from "react"
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AppBar, Button, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material/';
import { getAuth, signOut } from "firebase/auth";
import {
    AccountCircle,
    KeyboardArrowDown,
    Logout as LogoutIcon
} from "@mui/icons-material"
import { useTheme } from "../theme/useTheme";

import NavDrawer from "./NavDrawer/NavDrawer";
import ProfileDropdown from "../Profile/ProfileDropdown";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";

import * as navStyles from './NavBar.module.css';
import * as C from "../utilities/constants";

import {
    AppLogo,
    AuthenticationButton,
    LoginButtonsContainer,
    NavItemsContainer,
    StyledNavLink,
    StyledDarkModeIcon,
    StyledLightModeIcon,
    AccountIconsContainer
} from "./NavStyles";

const NavBar = props => {
    // TODO: Change to use redux slice
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const auth = getAuth();
    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    const dropdownRef = useRef(null);

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${theme.palette.text.primary}`
    });

    /**
     * Display alert showing that the user has successfully logged out
     */
    const displayLogoutAlert = () => {
        setShowAlert(true);
        setAlertType(C.SUCCESS);
        setTimeout(() => {
            setShowAlert(false);
        }, 1000);
    }


    /*
        TODO: Consolidate AlertJSX into a single component for all alerts in the application?
    */
    const returnAlertJSX = () => {
        // return (
        //     <Alert
        //         className={appStyles.alert}
        //         severity={alertType}
        //     >
        //         <AlertTitle>
        //             <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
        //         </AlertTitle>
        //         {alertType === C.SUCCESS ? C.LOGOUT_SUCCESS_MSG : C.LOGOUT_ERROR_MSG}
        //     </Alert>
        // );
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
            displayLogoutAlert();
        }).catch((error) => {
            console.error("Something bad happened = ", error);
        });
    }

    return (
        <>
            <AppBar position="static" color="inherit">
                <Toolbar>
                    {/* <AppLogo
                        src={QuizaroniLogo}
                        alt="Quizaroni logo"
                    /> */}
                    <Typography
                        color="primary"
                        variant="h4"
                    >
                        Quizaroni
                    </Typography>
                    {isMobile ?
                        <NavDrawer />
                        :
                        <NavItemsContainer>
                            <StyledNavLink
                                to="/"
                                style={activeLinkStyle}
                            >
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

                            <div className={navStyles.rightActions}>
                                <div>
                                    {userAuthState ?
                                        <AuthenticationButton
                                            variant="outlined"
                                            onClick={() => handleLogout()}
                                        >
                                            <LogoutIcon />
                                            Log out
                                        </AuthenticationButton>
                                        :
                                        <LoginButtonsContainer>
                                            <AuthenticationButton
                                                variant="outlined"
                                                onClick={() => navigate("/login")}
                                            >
                                                Log in
                                            </AuthenticationButton>
                                            <AuthenticationButton
                                                variant="contained"
                                                onClick={() => navigate("/signup")}
                                            >
                                                Sign up
                                            </AuthenticationButton>
                                        </LoginButtonsContainer>
                                    }
                                </div>
                                <Tooltip title="Toggle dark mode">
                                    <IconButton onClick={toggleDarkMode}>
                                        {isDarkMode ? <StyledLightModeIcon /> : <StyledDarkModeIcon />}
                                    </IconButton>
                                </Tooltip>
                                {userAuthState &&
                                    (
                                        <>
                                            <AccountIconsContainer
                                                onClick={() => setShowDropdown(true)}
                                                ref={dropdownRef}
                                            >
                                                <AccountCircle fontSize="large" />
                                                <KeyboardArrowDown fontSize="large" />
                                            </AccountIconsContainer>
                                            <ProfileDropdown
                                                userAuthState={userAuthState}
                                                showDropdown={showDropdown}
                                                dropdownRef={dropdownRef}
                                                setShowDropdown={setShowDropdown}
                                            />
                                        </>
                                    )
                                }
                            </div>
                        </NavItemsContainer>
                    }
                </Toolbar>
            </AppBar>
            {showAlert &&
                returnAlertJSX()
            }
        </>
    );
}

export default NavBar;