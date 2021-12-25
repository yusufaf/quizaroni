import React, { useState, useEffect, useRef } from "react"

import { query, where, collection } from "@firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css';

import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';

import { useTheme } from "../theme/useTheme";
import * as loginStyles from './Login.module.css';
import * as appStyles from "../App.module.css";
/*
    Login Component
*/
const Login = props => {
    const { userAuthState, setUserAuthState } = props;

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

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

    useEffect(() => {
        console.log("LocalStorage object in useEffect", localStorage);
        /* If the user info is in localStorage, keep them logged in */
        if (localStorage.getItem("userInfo") !== null) {
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            console.log("userInfo  currently stored in localStorage = ", userInfo);
            const tokenExpiration = userInfo.stsTokenManager.expirationTime;

            /* If the user's token hasn't expired */
            if (Date.now() < tokenExpiration) {
                setUserAuthState(userInfo);
            }
        }
    }, [])


    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    const handleLogin = () => {
        if (enteredEmail?.trim() && enteredPass?.trim()) {
            /* When they log in, need to set some state based on idk */
            const usersCollection = collection(database, "users");

            // Firebase Auth Sign-In
            const auth = getAuth();
            signInWithEmailAndPassword(auth, enteredEmail, enteredPass)
                .then((userCredential) => {
                    // If in the then() callback: Successfully signed in
                    const user = userCredential.user;
                    console.log("Signed in user = ", user);
                    console.log("auth.currentUser = ", auth.currentUser)
                    setUserAuthState(user);

                    localStorage.setItem('userInfo', JSON.stringify(user));
                    setShowAlert(true);
                    setAlertType("success");
                    setTimeout(() => {
                        setShowAlert(false);

                        // Redirect user to their home page after
                        // navigate("/", { replace: true });
                    }, 500);
                })
                .catch((error) => {
                    // Can use this to display some error in the form of an alert popup / banner
                    const errorCode = error.code;
                    const errorMessage = error.message;

                    console.log(`Couldn't login. Error ${errorCode} = ${errorMessage}`);

                    setShowAlert(true);
                    setAlertType("error");
                    setTimeout(() => {
                        setShowAlert(false);

                        // Redirect user to their home page after
                        // navigate("/", { replace: true });
                    }, 500);
                });
        }
    }

    return (
        <>
            <div className={loginStyles.loginContainer} style={{ color: theme.foreground, background: theme.background }}>
                {userAuthState ?
                    <div
                        style={{ textAlign: "center" }}
                    >
                        <b>You're already logged in!</b>
                    </div>
                    :
                    (
                        <>
                            <div className={appStyles.title}>
                                Login
                            </div>

                            <input
                                className={
                                    showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                        : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
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
                                className={showErrorText.passInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                    : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
                                name="passInput"
                                placeholder="Type your password"
                                type={passVisibility ? "text" : "password"}
                                onBlur={e => checkIfInputEmpty(e)}
                                onChange={e => setEnteredPass(e.target.value)}
                            />
                            {/* Show/Hide Password */}
                            {passVisibility ?
                                <Visibility
                                    className={`${loginStyles.passToggle} ${isDarkMode && loginStyles.dark}`}
                                    onClick={() => setPassVisibility(!passVisibility)}
                                >
                                </Visibility> :
                                <VisibilityOff
                                    className={`${loginStyles.passToggle} ${isDarkMode && loginStyles.dark}`}
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
                        </>
                    )
                }
            </div>

            {showAlert &&
                <Alert
                    className={loginStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === "success" ? "Success" : "Error"}</b>
                    </AlertTitle>
                    {alertType === "success" ? "Successfully logged in!" : "Could not login, check email and password"}
                </Alert>
            }
        </>
    );
}

export default Login;