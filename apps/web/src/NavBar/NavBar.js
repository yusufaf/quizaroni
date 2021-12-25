import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, NavLink, Link } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { getAuth, signOut } from "firebase/auth";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { AccountCircle, KeyboardArrowDown } from "@mui/icons-material"
import Login from "../Login/Login";
import Signup from "../Signup/Signup";
// import Home from "../Home/Home";
// import Profile from "../Profile/Profile";
import { useTheme } from "../theme/useTheme";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";
import * as appStyles from '../App.module.css';
import * as navStyles from './NavBar.module.css';
import CreateSet from "../CreateSet/CreateSet";

/*
    Navigation Bar Component
*/
const NavBar = props => {
    const { userAuthState, setUserAuthState } = props;

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const auth = getAuth();

    // Dropdown for account actions / settings / profile in top right corner
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        document.body.style.transition = "0.2s ease";
        document.body.style.backgroundColor = theme.body;
    }, [isDarkMode, theme])


    /* Using Firebase's built in sign out method */
    const handleLogout = () => {
        console.log("Current user authentication object = ", auth);

        /* Sign out the currently logged in user */
        signOut(auth).then(() => {
            // Sign-out successful.
            console.log("User successfully signed out");
            if (localStorage.getItem("userInfo") !== null) {
                localStorage.removeItem("userInfo");
            }
            setUserAuthState(null);
        }).catch((error) => {
            console.error("Something bad happened = ", error);
        });

    }

    return (
        <nav className={navStyles.navbar}
            style={{ color: theme.foreground, background: theme.background }}
        >
            <img
                className={navStyles.logo}
                src={QuizaroniLogo}
                alt="Quizaroni logo"
            />
            <div className={navStyles.menu}>
                <li >
                    <NavLink to="/" className={navStyles.link}
                        style={({ isActive }) => ({
                            borderBottom: isActive ? '0.2rem solid orange' : 'none',
                            color: `${theme.foreground}`
                        })}
                    >
                        Home
                    </NavLink>
                </li>
                <li >
                    <NavLink
                        to="/login"
                        className={navStyles.link}
                        style={({ isActive }) => ({
                            borderBottom: isActive ? '0.2rem solid orange' : 'none',
                            color: `${theme.foreground}`
                        })}
                    >
                        Login
                    </NavLink>
                </li>
                <li >
                    <NavLink
                        to="/create"
                        className={navStyles.link}
                        style={({ isActive }) => ({
                            borderBottom: isActive ? '0.2rem solid orange' : 'none',
                            color: `${theme.foreground}`
                        })}
                    >Create
                    </NavLink>
                </li>
                <li >
                    <NavLink
                        to="/login"
                        className={navStyles.link}
                        style={({ isActive }) => ({
                            borderBottom: isActive ? '0.2rem solid orange' : 'none',
                            color: `${theme.foreground}`
                        })}

                    >
                        My Flashcards
                    </NavLink>
                </li>
                <div className={navStyles.rightActions}>
                    <li>
                        {userAuthState &&
                            <div
                                className={navStyles.logout}
                                style={{ color: `${theme.foreground}` }}
                                onClick={() => handleLogout()}
                            >
                                Logout
                            </div>
                        }
                    </li>
                    <DarkModeIcon
                        onClick={toggleDarkMode}
                        className={navStyles.darkModeToggle}
                        style={{ color: isDarkMode ? "yellow" : "#121212", fontSize: "2rem" }}
                    />
                    <div
                        className={navStyles.accountCircle}
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <AccountCircle
                            style={{ fontSize: "2rem" }}
                        />
                        <KeyboardArrowDown
                            style={{ fontSize: "2rem" }}
                        />
                    </div>
                    {showDropdown &&

                        <div
                            className={navStyles.dropdown}
                        >
                            {/* Profile is only accessible if they login */}
                            {userAuthState &&
                                <div className={navStyles.dropdownItem}>
                                    <Link
                                        className={`${navStyles.dropdownLink} ${isDarkMode ? appStyles.darkBorder : appStyles.lightBorder}`}
                                        to="/profile"
                                        style={{
                                            color: `${theme.foreground}`
                                        }}
                                    >
                                        Profile
                                    </Link>
                                </div>
                            }
                        </div>
                    }

                </div>

            </div>
        </nav>
    );
}

export default NavBar;