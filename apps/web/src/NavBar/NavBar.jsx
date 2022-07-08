import { useState, useEffect, useRef } from "react"
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AppBar, Button, Toolbar, Tooltip, useMediaQuery } from '@mui/material/';
import { getAuth, signOut } from "firebase/auth";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { AccountCircle, KeyboardArrowDown } from "@mui/icons-material"
import { useTheme } from "../theme/useTheme";
import { styled } from "@mui/system";

import ProfileDropdown from "../Profile/ProfileDropdown";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";

import * as appStyles from '../App.module.css';
import * as navStyles from './NavBar.module.css';
import * as C from "../utilities/constants";

const NavBar = props => {
    const { userAuthState, setUserAuthState } = props;
    const {isDarkMode, toggleDarkMode, theme} = useTheme();

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
        return (
            <Alert
                className={appStyles.alert}
                severity={alertType}
            >
                <AlertTitle>
                    <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                </AlertTitle>
                {alertType === C.SUCCESS ? C.LOGOUT_SUCCESS_MSG : C.LOGOUT_ERROR_MSG}
            </Alert>
        );
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
            {/* TODO: Change theming because the bar shouldn't be yellow */}
            <AppBar position="static">
                <Toolbar>

                </Toolbar>
            </AppBar>
            <nav className={navStyles.navbar}
            >
                <img
                    className={navStyles.logo}
                    src={QuizaroniLogo}
                    alt="Quizaroni logo"
                />
                <div className={navStyles.menu}>
                    <div>
                        <NavLink to="/" className={navStyles.link}
                            style={activeLinkStyle}
                        >
                            Home
                        </NavLink>
                    </div>
                    <div >
                        <NavLink
                            to="/create"
                            className={navStyles.link}
                            style={activeLinkStyle}
                        >
                            Create
                        </NavLink>
                    </div>
                    <div >
                        <NavLink
                            to="/explore"
                            className={navStyles.link}
                            style={activeLinkStyle}
                        >
                            Explore
                        </NavLink>
                    </div>
                    <div className={navStyles.rightActions}>
                        <div>
                            {userAuthState ?
                                <div
                                    className={navStyles.logout}
                                    // style={{ color: `${theme.foreground}` }}
                                    onClick={() => handleLogout()}
                                >
                                    <span className="material-icons-outlined">
                                        logout
                                    </span>
                                    Logout
                                </div>
                                :
                                <div >
                                    {/* <span className="material-icons-outlined">
                                        login
                                    </span>
                                    <NavLink
                                        to="/login"
                                        className={navStyles.link}
                                        style={activeLinkStyle}
                                    >
                                        Login
                                    </NavLink> */}
                                    {/* TODO: 
                                    - Determine if outline or text button is better for log in 
                                    - Theming, again. 
                                    */}
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            textTransform: "none"
                                        }}
                                        onClick={() => navigate("/login")}
                                    >   
                                        Log in
                                    </Button>
                                    <Button
                                        variant="contained"
                                        sx={{
                                            textTransform: "none"
                                        }}
                                        onClick={() => navigate("/signup")}
                                    // sx={{ background: "orange" }}
                                    >
                                        Sign up
                                    </Button>
                                </div>
                            }
                        </div>
                        <Tooltip
                            title="Toggle dark mode"
                        >
                            <DarkModeIcon
                                onClick={toggleDarkMode}
                                className={navStyles.darkModeToggle}
                                style={{ color: isDarkMode ? "yellow" : "#121212", fontSize: "2rem" }}
                            />
                        </Tooltip>
                        {userAuthState &&
                            (
                                <>
                                    <div
                                        className={navStyles.accountCircle}
                                        onClick={() => setShowDropdown(true)}
                                        ref={dropdownRef}
                                    >
                                        <AccountCircle
                                            style={{ fontSize: "2rem" }}
                                        />
                                        <KeyboardArrowDown
                                            style={{ fontSize: "2rem" }}
                                        />
                                    </div>
                                    <ProfileDropdown userAuthState={userAuthState} showDropdown={showDropdown}
                                        dropdownRef={dropdownRef} setShowDropdown={setShowDropdown}
                                    />
                                </>
                            )
                        }
                    </div>
                </div>
            </nav>
            {showAlert &&
                returnAlertJSX()
            }
        </>
    );
}

export default NavBar;