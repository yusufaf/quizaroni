import React, { useState, useCallback, useEffect, useRef } from "react"

import { doc, updateDoc, query, where, collection, getDoc, getDocs } from "@firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css';

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as loginStyles from './Login.module.css';
import * as appStyles from "../App.module.css";
import * as C from "../utilities/constants";

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

    /**
     * Display alert indicating status of login attempt
     * @param {*} type 
     */
    const displayLoginAlert = (type) => {
        setShowAlert(true);
        if (type === C.SUCCESS) {
            setAlertType(C.SUCCESS);
            setTimeout(() => {
                setShowAlert(false);

                // Redirect user to their home page after
                navigate("/");
            }, 500);
            return;
        }
        if (type === C.ERROR) {
            setAlertType(C.ERROR);
            setTimeout(() => {
                setShowAlert(false);
            }, 500);
            return;
        }
    }

    const returnAlertJSX = () => {
        return (
            <Alert
                className={appStyles.alert}
                severity={alertType}
            >
                <AlertTitle>
                    <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                </AlertTitle>
                {alertType === C.SUCCESS ? C.LOGIN_SUCCESS_MSG : C.LOGIN_ERROR_MSG}
            </Alert>
        );
    }

    /**
     * Update the last time the user signed in on the database
     * @param {*} uid 
     */
    const updateLastSignIn = async (uid) => {
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const querySnapshot = await getDocs(queryResult);

        const userDoc = querySnapshot.docs[0];
        if (userDoc) {
            const userRef = userDoc.ref;
             updateDoc(userRef, {
                lastSignInDate: new Date().toLocaleDateString()
            });
        }
    }

    const handleLogin = () => {
        if (enteredEmail.trim() && enteredPass.trim()) {
            // Firebase Auth Sign-In
            const auth = getAuth();
            signInWithEmailAndPassword(auth, enteredEmail, enteredPass)
                .then((userCredential) => {
                    /* If in the then() callback: Successfully signed in */
                    const user = userCredential.user;
                    const { uid } = user;
                    setUserAuthState(user);
                    updateLastSignIn(uid);
                    localStorage.setItem('userInfo', JSON.stringify(user));
                    displayLoginAlert(C.SUCCESS);
                })
                .catch((error) => {
                    /* Could not sign in, error occurred */
                    const errorCode = error.code;
                    const errorMessage = error.message;

                    console.log(`Couldn't login. Error ${errorCode} = ${errorMessage}`);
                    displayLoginAlert(C.ERROR);
                });
        }
    }

    /* Function to check if "Enter" key was hit and call function */
    const enterKeyHandler = (e) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleLogin();
        }
    };

    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    return (
        <>
            {userAuthState ?
                <LoginMessage page="login" />
                :
                (
                    <div className={loginStyles.loginContainer}
                        style={{ color: theme.foreground, background: theme.background }}
                        onKeyPress={enterKeyHandler}
                    >
                        <>
                            <div className={`${appStyles.title} ${loginStyles.title}`}>
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
                            <button
                                className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                                onClick={() => handleLogin()}
                            >
                                <b>Log In</b>
                            </button>

                            {/* Signup Link  */}
                            <Link
                                className={loginStyles.signupLink}
                                to="/signup"
                            >
                                Don't have an account? Click here to sign up!
                            </Link>
                        </>

                    </div>
                )
            }
            {showAlert &&
                returnAlertJSX()
            }
        </>
    );
}

export default Login;