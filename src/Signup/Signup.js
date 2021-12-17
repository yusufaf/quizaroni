import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';

import * as loginStyles from '../Login/Login.module.css';
import * as signupStyles from "../Signup/Signup.module.css"

/*
    Signup Component
*/
const Signup = props => {

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    /* Signup Input States */
    const [enteredEmail, setEnteredEmail] = useState("");
    const [enteredPass, setEnteredPass] = useState("");
    const [enteredUsername, setEnteredUsername] = useState("");
    const [passVisibility, setPassVisibility] = useState(false);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        nameInput: false,
        passInput: false,
    })

    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    const handleSignup = () => {

    }

    return (
        <div className={loginStyles.loginContainer}>
            <div className={loginStyles.title}>
                Signup
            </div>

            {/* Email Input  */}
            <input
                className={showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error}` : `${loginStyles.input}`}
                name="emailInput"
                placeholder="Type your email address"
                onBlur={e => checkIfInputEmpty(e)}
                onChange={e => setEnteredEmail(e.target.value)}
            />

            {showErrorText.emailInput &&
                <span className={signupStyles.emailError}>
                    An email is required.
                </span>
            }

            {/* Username Input */}
            <input
                className={showErrorText.nameInput ? `${loginStyles.input} ${loginStyles.error}` : `${loginStyles.input}`}
                name="nameInput"
                placeholder="Type your username"
                onBlur={e => checkIfInputEmpty(e)}
                onChange={e => setEnteredUsername(e.target.value)}
            />

            {showErrorText.nameInput &&
                <span className={signupStyles.nameError}>
                    A username is required.
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
                    className={signupStyles.passToggle}
                    onClick={() => setPassVisibility(!passVisibility)}
                >
                </Visibility> :
                <VisibilityOff
                    className={signupStyles.passToggle}
                    onClick={() => setPassVisibility(!passVisibility)}
                >
                </VisibilityOff>
            }
            {showErrorText.passInput &&
                <span className={signupStyles.passwordError}>
                    A password is required.
                </span>
            }

            {/* Signup Button */}
            <div
                className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                onClick={() => handleSignup()}
            >
                Log In
            </div>

            {/* Signup Link  */}
            <Link
                className={loginStyles.signupLink}
                to="/login"
            >
                Already have an account? Click here to login!
            </Link>
        </div>
    );
}

export default Signup;