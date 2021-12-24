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
import * as navStyles from './NavBar.module.css';
import CreateSet from "../CreateSet/CreateSet";

/*
    Navigation Bar Component
*/
const NavBar = props => {
    const { isDarkMode, toggleDarkMode, theme } = useTheme();
    const auth = getAuth();

    // Dropdown for account actions / settings / profile in top right corner
    const [showDropdown, setShowDropdown] = useState();

    useEffect(() => {
        document.body.style.backgroundColor = theme.body;
    }, [isDarkMode, theme])



    /* Using Firebase's built in sign out method */
    const handleLogout = () => {
        console.log("Current user authentication object = ", auth);

        /* Sign out the currently logged in user */
        signOut(auth).then(() => {
            // Sign-out successful.
            console.log("User successfully signed out");
        }).catch((error) => {
            // An error happened.
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
                <div
                    className={navStyles.logout}
                    style={{ color: `${theme.foreground}` }}
                    onClick={() => handleLogout()}
                >
                    Logout
                </div>
                <DarkModeIcon
                    onClick={toggleDarkMode}
                    className={navStyles.darkModeToggle}
                    style={{ color: isDarkMode ? "yellow" : "#121212", fontSize: "2rem" }}
                />
            </div>
        </nav>
    );
}

export default NavBar;