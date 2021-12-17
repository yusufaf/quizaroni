import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, NavLink, Link } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import Login from "../Login/Login";
import Signup from "../Signup/Signup";
// import Home from "../Home/Home";
// import Profile from "../Profile/Profile";
// import { AccountCircle, KeyboardArrowDown } from "@material-ui/icons";
import QuizaroniLogo from "../resources/images/Quizaroni_Logo.png";
import * as navStyles from './NavBar.module.css';
import CreateSet from "../CreateSet/CreateSet";

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
                    <NavLink to="/" className={navStyles.link}>Home</NavLink>
                </li>
                <li >
                    <NavLink
                        to="/login"
                        className={navStyles.link} 
                        style={({ isActive }) => ({
                            borderBottom: isActive ? '0.2rem solid #61B874' : 'none',
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
                            borderBottom: isActive ? '0.2rem solid #61B874' : 'none',
                        })}
                    >Create</NavLink>
                </li>
                <li >
                    <NavLink to="/login" className={navStyles.link}>My Flashcards</NavLink>
                </li>
                <li className="dark-mode">
                    {/* <DarkModeIcon /> */}
                </li>
            </div>
        </nav>
    );
}

export default NavBar;