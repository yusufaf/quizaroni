import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, Link } from "react-router-dom";
import Login from "../Login/Login";
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
            <div className={navStyles.menu}>
                <li >
                    <Link to="/" className={navStyles.link}>Home</Link>
                </li>
                <li >
                    <Link to="/login" className={navStyles.link}>Login</Link>
                </li>
                <li >
                    <Link to="/login" className={navStyles.link}>My Flashcards</Link>
                </li>
                <li className="dark-mode">
                    {/* <DarkModeIcon /> */}
                </li>
            </div>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <Login />
                    }
                />
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