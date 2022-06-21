import { useState, useEffect, useRef } from "react"

import { doc, updateDoc, query, where, collection, getDocs } from "@firebase/firestore";
import { database } from "../firebase/firebase";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css';

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Button, Card, Typography, TextField, InputAdornment, IconButton} from '@mui/material/';
import { Visibility, VisibilityOff } from '@mui/icons-material/';
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as loginStyles from './Login.module.css';
import * as appStyles from "../App.module.css";
import * as C from "../utilities/constants";
import { updateBrowserTitle } from "../utilities/functions";

const Login = props => {
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

                // Google Access Token in the authResult object?

                console.log("authResult = ", authResult);
                // User successfully signed in.
                // Return type determines whether we continue the redirect automatically
                // or whether we leave that to developer to handle.
                setUserAuthState(user);
                updateLastSignIn(uid);
                localStorage.setItem('userInfo', JSON.stringify(user));
                displayLoginAlert(C.SUCCESS);
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
        updateBrowserTitle("Login")
    }, [])

    useEffect(() => {
        firebaseUI = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
        if (firebaseUI && !userAuthState) {
            firebaseUI.start('#firebaseui-auth-container', uiConfig);
        }
    }, [])

    // TODO: Possible quality of life styling
    // useEffect(() => {
    //     let element = document.querySelector(".firebaseui-idp-button");
    //     if (element) {
    //         console.log("Setting color to ", theme.foreground);
    //         element.style.backgroundColor = `${theme.foreground}`;
    //     }
    // }, [theme])

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

    // const handleGoogleSignIn = () => {
    //     signInWithPopup(auth, provider)
    //         .then((result) => {
    //             // This gives you a Google Access Token. You can use it to access the Google API.
    //             const credential = GoogleAuthProvider.credentialFromResult(result);
    //             const token = credential.accessToken;
    //             // The signed-in user info.
    //             const user = result.user;
    //             const { uid } = user;
    //             setUserAuthState(user);
    //             updateLastSignIn(uid);
    //             localStorage.setItem('userInfo', JSON.stringify(user));
    //             displayLoginAlert(C.SUCCESS);
    //         })
    //         .catch((error) => {
    //             console.log(`Couldn't sign in with Google`);
    //             displayLoginAlert(C.ERROR);
    //         });
    // }

    const handleLogin = () => {
        if (enteredEmail.trim() && enteredPass.trim()) {
            // Firebase Auth Sign-In
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
            <div className={loginStyles.loginPage}>
                <div className={loginStyles.loginContainer}
                    style={{ color: theme.foreground, background: theme.background }}
                    onKeyPress={enterKeyHandler}
                >
                    <>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: "bold",
                                alignSelf: "flex-start"
                            }}
                        >
                            Login
                        </Typography>

                        <TextField
                            label="Email"
                            value={enteredEmail}
                            onChange={e => setEnteredEmail(e.target.value)}
                            helperText={showErrorText.emailInput && "An email is required"}
                            size="small"
                        />

                        {/* TODO: Theme styling for show/hide password icon button
                            className={`${loginStyles.passToggle} ${isDarkMode && loginStyles.dark}`}
                        */}
                        <TextField
                            label="Password"
                            type={passVisibility ? 'text' : 'password'}
                            value={enteredPass}
                            onChange={e => setEnteredPass(e.target.value)}
                            size="small"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={() => setPassVisibility(!passVisibility)}
                                        edge="end"
                                      >
                                        {passVisibility ? <VisibilityOff /> : <Visibility />}
                                      </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* <input
                            className={
                                showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                    : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
                            name="emailInput"
                            placeholder="Type your email address"
                            onBlur={e => checkIfInputEmpty(e)}
                            onChange={e => setEnteredEmail(e.target.value)}
                        /> */}

                        {showErrorText.emailInput &&
                            <span className={loginStyles.emailError}>
                                An email is required.
                            </span>
                        }

{/* 
                        <input
                            className={showErrorText.passInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                                : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
                            name="passInput"
                            placeholder="Type your password"
                            type={passVisibility ? "text" : "password"}
                            onBlur={e => checkIfInputEmpty(e)}
                            onChange={e => setEnteredPass(e.target.value)}
                        /> */}
                        {showErrorText.passInput &&
                            <span className={loginStyles.passwordError}>
                                A password is required.
                            </span>
                        }

                        <Link to="/forgot" className={loginStyles.forgot}>
                            Forgot password?
                        </Link>

                        {/* Login Button */}
                        <Button
                            variant="contained"
                            disabled={enteredEmail === "" || enteredPass === ""}
                            onClick={() => handleLogin()}
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
                            Log In
                        </Button>
                        {/* <button
                                    className={enteredEmail === "" || enteredPass === "" ? `${loginStyles.login} ${loginStyles.disabled}` : `${loginStyles.login}`}
                                    onClick={() => handleLogin()}
                                >
                                    <b>Log In</b>
                                </button> */}
                        {/* Signup Link  */}
                        <Link
                            className={loginStyles.signupLink}
                            to="/signup"
                        >
                            Don't have an account? Click here to sign up!
                        </Link>
                    </>
                </div>
                <div id="firebaseui-auth-container"
                    className={loginStyles.firebaseUI}
                    style={{ color: theme.foreground, background: theme.background }}
                >
                </div>
                <div id="loader">Loading...</div>
            </div>
            {showAlert &&
                returnAlertJSX()
            }
        </>
    );
}

export default Login;