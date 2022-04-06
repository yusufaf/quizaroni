import { useState, useEffect } from "react"

import { doc, updateDoc, query, where, collection, addDoc } from "firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css';

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Button, Card, Typography } from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as loginStyles from '../Login/Login.module.css';
import * as signupStyles from "../Signup/Signup.module.css"
import * as appStyles from "../App.module.css";
import * as C from "../utilities/constants";

const Signup = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();


    /* OAuth Variables */
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let firebaseUI;

    let uiConfig = {
        callbacks: {
            signInSuccessWithAuthResult: (authResult, redirectUrl) => {
                const { user } = authResult;
                const { uid } = user;

                console.log("authResult = ", authResult);
                // User successfully signed in.
                // Return type determines whether we continue the redirect automatically
                // or whether we leave that to developer to handle.

                const usersCollection = collection(database, "users");

                /* TODO: If using Firebase authentication, no need to store the passwords yourself */
                const userRef = addDoc(usersCollection, {
                    username: enteredUsername,
                    password: enteredPass,
                    email: enteredEmail,
                    defaultTheme: "dark",
                    creationDate: new Date().toLocaleDateString(),
                    lastSignInDate: new Date().toLocaleDateString(),
                    uid,
                    labels: [],
                });

                setUserAuthState(user);
                localStorage.setItem('userInfo', JSON.stringify(user));
                displaySignupAlert(C.SUCCESS);
                return false;
            },
            uiShown: function () {
                // The widget is rendered. + Hide the loader
                document.getElementById('loader').style.display = 'none';
            }
        },
        // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
        signInFlow: 'popup',
        signInOptions: [
            GoogleAuthProvider.PROVIDER_ID,
        ],
    };

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

    useEffect(() => {
        document.title = `Quizaroni | Sign Up`
        return () => {
            document.title = `Quizaroni`;
        }
    }, [])

    useEffect(() => {
        firebaseUI = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
        if (firebaseUI && !userAuthState) {
            firebaseUI.start('#firebaseui-auth-container', uiConfig);
        }
    }, [])

    /**
   * Display alert indicating status of sign up attempt
   * @param {*} type 
   */
    const displaySignupAlert = (type) => {
        setShowAlert(true);
        if (type === C.SUCCESS) {
            setAlertType(C.SUCCESS);
            setTimeout(() => {
                setShowAlert(false);

                // Redirect user to their home page after
                navigate("/create", { replace: true });
            }, 1000);
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
            try {
                const auth = getAuth();
                createUserWithEmailAndPassword(auth, enteredEmail, enteredPass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        // TODO: There's some refresh + access token stuff in the userCredential object
                        const { uid } = user;
                        console.log("userCredential upon user sign up = ", userCredential);

                        /* Add a new entry for the new user in the database */
                        const usersCollection = collection(database, "users");

                        /* TODO: If using Firebase authentication, no need to store the passwords yourself */
                        const userRef = addDoc(usersCollection, {
                            username: enteredUsername,
                            password: enteredPass,
                            email: enteredEmail,
                            defaultTheme: "dark",
                            creationDate: new Date().toLocaleDateString(),
                            lastSignInDate: new Date().toLocaleDateString(),
                            uid,
                            labels: [],
                        });
                        // If successfully signed up, user signed in automatically
                        setUserAuthState(user);
                        displaySignupAlert(C.SUCCESS);
                    })
                    .catch((error) => {
                        const errorCode = error.code;
                        // In here, account creation can fail if the account already exists or the password is invalid.
                        const errorMessage = error.message;
                        console.log(`Error ${errorCode} = ${errorMessage}`);
                        displaySignupAlert(C.ERROR);
                    });
            } catch (e) {
                console.error("Error adding document: ", e);
            }
        }
    }

    /**
     * Checks if the enter key was pressed, calls sign up function
     * @param {*} e 
     */
    const enterKeyHandler = (e) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleSignup();
        }
    };

    const returnAlertJSX = () => {
        return (
            <Alert
                className={appStyles.alert}
                severity={alertType}
            >
                <AlertTitle>
                    <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                </AlertTitle>
                {alertType === C.SUCCESS ? C.SIGNUP_SUCCESS_MSG : C.SIGNUP_ERROR_MSG}
            </Alert>
        );
    }

    return (
        <>
            {userAuthState ?
                <LoginMessage page="signup" />
                :
                (
                    <>
                        <div
                            className={loginStyles.loginContainer}
                            style={{ color: theme.foreground, background: theme.background }}
                            onKeyPress={enterKeyHandler}
                        >
                            <div className={`${appStyles.title} ${loginStyles.title}`}>
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

                            <Button
                                variant="contained"
                                disabled={enteredEmail === "" || enteredPass === ""}
                                onClick={() => handleSignup()}
                                sx={{
                                    backgroundColor: "orange",
                                    color: theme.foreground,
                                    fontSize: "1rem",
                                    "&.Mui-disabled": {
                                        backgroundColor: "orange",
                                        cursor: "not-allowed"
                                    },
                                    "&.MuiButton-root:hover": {
                                        backgroundColor: "rgb(206, 143, 27)"
                                    }
                                }}
                            >
                                Sign Up
                            </Button>

                            {/* Signup Button */}
                            {/* <button
                                className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                                onClick={() => handleSignup()}
                            >
                                <b>Sign Up</b>
                            </button> */}

                            {/* Signup Link  */}
                            <Link
                                className={loginStyles.signupLink}
                                to="/login"
                            >
                                Already have an account? Click here to login!
                            </Link>
                        </div>
                        <div id="firebaseui-auth-container"
                            className={loginStyles.firebaseUI}
                            style={{ color: theme.foreground, background: theme.background }}
                        >
                        </div>
                        <div id="loader">Loading...</div>
                    </>
                )
            }
            {showAlert &&
                returnAlertJSX()
            }
        </>
    );
}

export default Signup;