import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, Link } from "react-router-dom";
// import Login from "./Login";
// import Signup from "../Signup/Signup";
// import Home from "../Home/Home";
// import Profile from "../Profile/Profile";
import { Alert, AlertTitle } from '@mui/material/';
import DarkModeIcon from '@mui/icons-material/DarkMode';
// import { AccountCircle, KeyboardArrowDown } from "@material-ui/icons";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";
import * as navStyles from './NavBar.module.css';

/*
    Navigation Bar Component
*/
const NavBar = props => {
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    return (
        <nav className={navStyles.navbar}>
            <img
                className={navStyles.logo}
                src={QuizaroniLogo}
                alt="Quizaroni logo"
            />
            <input type="checkbox" id={navStyles["checkbox_toggle"]} />
            <label for="checkbox_toggle" class="hamburger">&#9776;</label>
            <div className={navStyles.menu}>
                <li className="link-item">
                    <Link className={navStyles.link} to="/">Home</Link>
                </li>
                <li className="dark-mode">
                    {/* <DarkModeIcon /> */}
                </li>
            </div>
            <Routes>

                {/* <Route
                    path="/signup"
                    element={
                        // <Signup />
                    }
                /> */}
                {/* <Route
                    path='/profile'
                    element={
                        // <Profile/>
                    }
                /> */}
            </Routes>
        </nav>
    );
}

export default NavBar;