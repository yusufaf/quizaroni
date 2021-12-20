import React, { useState, useEffect, useRef } from "react"

import { query, where, collection } from "@firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";
import { GoogleAuthProvider } from "firebase/auth";

import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';

import * as loginStyles from './Login.module.css';
/*
    Login Component
*/
const Login = props => {

    /* OAuth Variables */
    const provider = new GoogleAuthProvider();

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    /* Login Input States */
    const [enteredEmail, setEnteredEmail] = useState("");
    const [enteredPass, setEnteredPass] = useState("");
    const [passVisibility, setPassVisibility] = useState(false);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        passInput: false
    })

    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    const handleLogin = () => {

        const usersCollection = collection(database, "users");

    }

    return (
        <div className={loginStyles.loginContainer}>
            <div className={loginStyles.title}>
                Login
            </div>

            <input
                className={showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error}` : `${loginStyles.input}`}
                name="emailInput"
                placeholder="Type your email address"
                onBlur={e => checkIfInputEmpty(e)}
                onChange={e => setEnteredEmail(e.target.value)}
            />

            {showErrorText.emailInput &&
                <span className={loginStyles.emailError}>
                     An email is required.
                </span>
            }
            {/* Password Input */}
            <input
                className={showErrorText.passInput ? `${loginStyles.input} ${loginStyles.error}` : `${loginStyles.input}`}
                name="passInput"
                placeholder="Type your password"
                type={passVisibility ? "text" : "password"}
                onBlur={e => checkIfInputEmpty(e)}
                onChange={e => setEnteredPass(e.target.value)}
            />
            {/* Show/Hide Password */}
            {passVisibility ?
                <Visibility
                    className={loginStyles.passToggle}
                    onClick={() => setPassVisibility(!passVisibility)}
                >
                </Visibility> :
                <VisibilityOff
                    className={loginStyles.passToggle}
                    onClick={() => setPassVisibility(!passVisibility)}
                >
                </VisibilityOff>
            }
            {showErrorText.passInput &&
                <span className={loginStyles.passwordError}>
                    A password is required.
                </span>
            }

            <Link to="/forgot" className={loginStyles.forgot}>
                Forgot password?
            </Link>

            {/* Login Button */}
            <div
                className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                onClick={() => handleLogin()}
            >
                <b>Log In</b>
            </div>

            {/* Signup Link  */}
            <Link
                className={loginStyles.signupLink}
                to="/signup"
            >
                Don't have an account? Click here to sign up!
            </Link>

        </div>
    );
}

export default Login;