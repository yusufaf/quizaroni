import React, { useState, useEffect, useRef } from "react"

import { addDoc, collection } from "@firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
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
import * as loginStyles from '../Login/Login.module.css';
import * as signupStyles from "../Signup/Signup.module.css"
import * as appStyles from "../App.module.css";
import * as C from "../utilities/constants";

/*
    Signup Component
*/
const Signup = props => {
    const { userAuthState, setUserAuthState } = props;

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

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

    /* Function for handling standard email/password signup method 
       Will likely have signup functions for Google OAuth
    */
    const handleSignup = async () => {
        if (enteredEmail?.trim() && enteredUsername?.trim() && enteredPass?.trim()) {
            console.log("Entered user information was not empty");

            console.log("database = ", database);
            try {
                // If using this Firebase Authentication, then have the createUserWithEmail() function before storing in databse
                // In the then(), store in the database?

                const usersCollection = collection(database, "users");
                const userRef = await addDoc(usersCollection, {
                    username: enteredUsername,
                    password: enteredPass,
                    email: enteredEmail,
                });

                console.log("Document written with ID: ", userRef);

                const auth = getAuth();
                createUserWithEmailAndPassword(auth, enteredEmail, enteredPass)
                    .then((userCredential) => {
                        // If successfully signed up, user signed in automatically
                        const user = userCredential.user;
                        console.log("Successfully created account = ", user);
                        setUserAuthState(user);

                        /* Display a success/error login alert for 1 second */
                        setShowAlert(true);
                        setAlertType(C.SUCCESS);
                        setTimeout(() => {
                            setShowAlert(false);
                            // Redirect user to the create page after
                            navigate("/create", { replace: true });
                        }, 1000);
                    })
                    .catch((error) => {
                        const errorCode = error.code;
                        // In here, account creation can fail if the account already exists or the password is invalid.
                        const errorMessage = error.message;
                        console.log(`Error ${errorCode} = ${errorMessage}`);

                        setShowAlert(true);
                        setAlertType("error");
                        setTimeout(() => {
                            setShowAlert(false);
                        }, 1000);
                    });
            } catch (e) {
                console.error("Error adding document: ", e);
            }
        }
    }

    return (
        <>
            {userAuthState ?
                <LoginMessage page="signup" />
                :
                (
                    <div className={loginStyles.loginContainer} style={{ color: theme.foreground, background: theme.background }}>
                        <div className={loginStyles.title}>
                            Sign up
                        </div>

                        {/* Email Input  */}
                        <input
                            className={showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
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
                            className={showErrorText.nameInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
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
                                className={`${signupStyles.passToggle} ${isDarkMode && signupStyles.dark}`}
                                onClick={() => setPassVisibility(!passVisibility)}
                            >
                            </Visibility> :
                            <VisibilityOff
                                className={`${signupStyles.passToggle} ${isDarkMode && signupStyles.dark}`}
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
                        <button
                            className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                            onClick={() => handleSignup()}
                        >
                            <b>Sign Up</b>
                        </button>

                        {/* Signup Link  */}
                        <Link
                            className={loginStyles.signupLink}
                            to="/login"
                        >
                            Already have an account? Click here to login!
                        </Link>
                    </div>
                )
            }
            {showAlert &&
                <Alert
                    className={appStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                    </AlertTitle>
                    {alertType === C.SUCCESS ? "Account successfully created!" : "Could not create an account"}
                </Alert>
            }
        </>
    );
}

export default Signup;