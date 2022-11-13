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
import { useDispatch, useSelector } from "react-redux";
import { selectAlert, setAlert } from "src/reducers/globalSlice";

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
    AccountIconsContainer,
    RightActionsContainer,
    NavLinksContainer
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

    const dispatch = useDispatch();
    const globalAlert = useSelector(selectAlert);

    // const [showAlert, setShowAlert] = useState(false);
    // const [alertType, setAlertType] = useState("");

    const dropdownRef = useRef(null);

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${theme.palette.text.primary}`
    });

    /**
     * Display alert showing that the user has successfully logged out
     */
    const displayLogoutAlert = () => {
        dispatch(
            setAlert({
                show: true,
                type: C.SUCCESS,
            })
        )

        // setShowAlert(true);
        // setAlertType(C.SUCCESS);
        setTimeout(() => {
            dispatch(
                setAlert({
                    show: false,
                    type: "",
                })
            )
        }, 1000);
    }


    /*
        TODO: Consolidate AlertJSX into a single component for all alerts in the application?
    */
    // const returnAlertJSX = () => {
    //     console.log("Entered returnAlertJsx with ", globalAlert)
    //     return (
    //         <Alert
    //             severity={globalAlert.type}
    //         >
    //             <AlertTitle>
    //                 <b>{globalAlert.type === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
    //             </AlertTitle>
    //             {globalAlert.type === C.SUCCESS ? C.LOGOUT_SUCCESS_MSG : C.LOGOUT_ERROR_MSG}
    //         </Alert>
    //     );
    // }

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
                            </NavLinksContainer>
                            <RightActionsContainer>
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
                            </RightActionsContainer>
                        </NavItemsContainer>
                    }
                </Toolbar>
            </AppBar>
        </>
    );
}

export default NavBar;