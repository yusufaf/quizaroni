import React, { useState, useEffect, useRef } from "react"
import { NavLink, Link } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { getAuth, signOut } from "firebase/auth";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { AccountCircle, KeyboardArrowDown } from "@mui/icons-material"
import { useTheme } from "../theme/useTheme";

import ProfileDropdown from "../Profile/ProfileDropdown";

import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";

import * as appStyles from '../App.module.css';
import * as navStyles from './NavBar.module.css';
import * as C from "../utilities/constants";

/*
    Navigation Bar Component
*/
const NavBar = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const auth = getAuth();

    /* Dropdown for account actions / settings / profile in top right corner */
    const [showDropdown, setShowDropdown] = useState(false);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? '0.2rem solid orange' : 'none',
        color: `${theme.foreground}`
    });

    /* Applying theme to body */
    useEffect(() => {
        document.body.style.transition = "0.2s ease";
        document.body.style.backgroundColor = theme.body;
    }, [isDarkMode, theme])

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
            <nav className={navStyles.navbar}
                style={{ color: theme.foreground, background: theme.background }}
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
                            to="/login"
                            className={navStyles.link}
                            style={activeLinkStyle}
                        >
                            Login
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
                    <div className={navStyles.rightActions}>
                        <div>
                            {userAuthState &&
                                <div
                                    className={navStyles.logout}
                                    style={{ color: `${theme.foreground}` }}
                                    onClick={() => handleLogout()}
                                >
                                    Logout
                                </div>
                            }
                        </div>
                        <DarkModeIcon
                            onClick={toggleDarkMode}
                            className={navStyles.darkModeToggle}
                            style={{ color: isDarkMode ? "yellow" : "#121212", fontSize: "2rem" }}
                        />
                        <div
                            className={navStyles.accountCircle}
                            onClick={() => {
                                setShowDropdown(true)
                            }}
                        >
                            <AccountCircle
                                style={{ fontSize: "2rem" }}
                            />
                            <KeyboardArrowDown
                                style={{ fontSize: "2rem" }}
                            />
                        </div>

                        {/* Account Options Dropdown */}
                        {showDropdown &&
                            <ProfileDropdown userAuthState={userAuthState} setShowDropdown={setShowDropdown} />
                        }
                    </div>
                </div>
            </nav>
            {showAlert &&
                <Alert
                    className={appStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                    </AlertTitle>
                    {alertType === C.SUCCESS ? "Successfully logged out!" : "Error when logging out"}
                </Alert>
            }
        </>
    );
}

export default NavBar;