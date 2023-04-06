import { useState, useEffect, useRef } from "react"
import { doc, updateDoc, query, where, collection, getDocs } from "@firebase/firestore";
import { database } from "../firebase/firebase";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import {
    Paper,
} from '@mui/material/';
import PasswordToggle from "src/components/PasswordToggle/PasswordToggle"
import { useTheme } from "src/theme/useTheme";
import * as C from "src/utilities/constants";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { 
    ForgotPasswordLink, 
    LoginPageContainer, 
    LoginContainer, 
    LoginField, 
    LoginTitle, 
    LoginButton, 
    StyledLink 
} from "./LoginStyles";
import { useDispatch } from "react-redux";
import { setAlert, setCognitoUser, setAuthenticated} from "src/slices/globalSlice";
import { Auth } from "@aws-amplify/auth";

const Login = props => {
    const { isDarkMode, theme } = useTheme();
    
    useBrowserTitle("Login");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    /* OAuth Variables */
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [passVisibility, setPassVisibility] = useState<boolean>(false);
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        passInput: false
    })

    const displayLoginAlert = (type) => {
        const showLoginToast = true;
        if (type === C.SUCCESS) {
            const loginSuccessAlert = {
                message: "Successfully logged in :)",
                open: showLoginToast,
                type: C.SUCCESS,
            };
            dispatch(setAlert(loginSuccessAlert));

            /* Redirect user to the home page after */
            navigate("/");
        }

        if (type === C.ERROR) {
            const loginFailureAlert = {
                message: "Failed to log in",
                open: showLoginToast,
                type: C.ERROR,
            };
            dispatch(setAlert(loginFailureAlert));
        }
        return;
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

    const handleLogin = async () => {
        try {
            const user = await Auth.signIn(username, password);
            console.log("Result of cognito sign in = ", user);

            /* Store cognito user and authenticated in state */
            dispatch(setCognitoUser(user))
            dispatch(setAuthenticated(true));

            

          } catch (error) {
            console.error('Error signing in', error);
        }


        // if (enteredEmail.trim() && enteredPass.trim()) {
        //     // Firebase Auth Sign-In
        //     signInWithEmailAndPassword(auth, enteredEmail, enteredPass)
        //         .then((userCredential) => {
        //             /* If in the then() callback: Successfully signed in */
        //             const user = userCredential.user;
        //             const { uid } = user;
        //             setUserAuthState(user);
        //             updateLastSignIn(uid);
        //             localStorage.setItem('userInfo', JSON.stringify(user));
        //             displayLoginAlert(C.SUCCESS);
        //         })
        //         .catch((error) => {
        //             /* Could not sign in, error occurred */
        //             const errorCode = error.code;
        //             const errorMessage = error.message;

        //             console.log(`Couldn't login. Error ${errorCode} = ${errorMessage}`);
        //             displayLoginAlert(C.ERROR);
        //         });
        // }
    }

    /* Function to check if "Enter" key was hit and call function */
    const enterKeyHandler = (e) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleLogin();
        }
    };

    const handleEmailChange = (e) => {
        setUsername(e.target.value);
    }

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    }

    return (
        <>
            <LoginPageContainer role="page">
                <Paper elevation={6}>
                    <LoginContainer
                        onKeyPress={enterKeyHandler}
                    >
                        <LoginTitle
                            variant="h5"
                        >
                            Login
                        </LoginTitle>
                        <LoginField
                            label="Email"
                            name="emailInput"
                            value={username}
                            onChange={handleEmailChange}
                            error={showErrorText.emailInput}
                            size="small"
                        />
                        <LoginField
                            label="Password"
                            type={passVisibility ? 'text' : 'password'}
                            value={password}
                            name="passInput"
                            onChange={handlePasswordChange}
                            error={showErrorText.passInput}
                            size="small"
                            InputProps={{
                                endAdornment:
                                    <PasswordToggle
                                        passwordVisibility={passVisibility}
                                        setPasswordVisibility={setPassVisibility}
                                    />
                            }}
                        />
                        <ForgotPasswordLink to="/forgot">
                            Forgot password?
                        </ForgotPasswordLink>
                        <LoginButton
                            variant="contained"
                            disabled={!username || !password}
                            onClick={() => handleLogin()}
                        >
                            Log In
                        </LoginButton>
                        <StyledLink
                            to="/signup"
                        >
                            Don't have an account? Click here to sign up!
                        </StyledLink>
                    </LoginContainer>
                </Paper>
            </LoginPageContainer>
        </>
    );
}

export default Login;