import {
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
} from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { database } from "../firebase/firebase";
import {
    Alert,
    AlertTitle,
    Box,
    Paper,
    Popover,
    Typography,
} from "@mui/material/";
import { useNavigate } from "react-router-dom";
import PasswordToggle from "src/components/PasswordToggle/PasswordToggle";
import * as C from "src/utilities/constants";
import { useTheme } from "../theme/useTheme";
import { BoldHeading } from "src/AppStyles";
import {
    LoginButton as SignupButton,
    LoginContainer as SignupContainer,
    LoginField as SignupField,
    LoginPageContainer as SignupPageContainer,
    LoginTitle as SignupTitle,
    StyledLink,
} from "src/Login/LoginStyles";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { useDispatch } from "react-redux";
import { setAlert } from "src/slices/globalSlice";
import { Auth } from "aws-amplify";

const Signup = (props) => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // let firebaseUI;

    // let uiConfig = {
    //     callbacks: {
    //         signInSuccessWithAuthResult: (authResult, redirectUrl) => {
    //             const { user } = authResult;
    //             const { uid } = user;

    //             console.log("authResult = ", authResult);
    //             // User successfully signed in.
    //             // Return type determines whether we continue the redirect automatically
    //             // or whether we leave that to developer to handle.

    //             const usersCollection = collection(database, "users");

    //             /* TODO: If using Firebase authentication, no need to store the passwords yourself */
    //             const userRef = addDoc(usersCollection, {
    //                 username: enteredUsername,
    //                 password: enteredPass,
    //                 email: enteredEmail,
    //                 defaultTheme: "dark",
    //                 creationDate: new Date().toLocaleDateString(),
    //                 lastSignInDate: new Date().toLocaleDateString(),
    //                 uid,
    //                 labels: [],
    //             });

    //             setUserAuthState(user);
    //             localStorage.setItem('userInfo', JSON.stringify(user));
    //             displaySignupAlert(C.SUCCESS);
    //             return false;
    //         },
    //         uiShown: function () {
    //             // The widget is rendered. + Hide the loader
    //             document.getElementById('loader').style.display = 'none';
    //         }
    //     },
    //     // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    //     signInFlow: 'popup',
    //     signInOptions: [
    //         GoogleAuthProvider.PROVIDER_ID,
    //     ],
    // };

    const dispatch = useDispatch();
    const navigate = useNavigate();

    /* Signup Input States */
    const [enteredEmail, setEnteredEmail] = useState("");
    const [enteredPass, setEnteredPass] = useState("");
    const [enteredUsername, setEnteredUsername] = useState("");
    const [passVisibility, setPassVisibility] = useState(false);

    const [anchorEl, setAnchorEl] = useState(null);

    // const [showAlert, setShowAlert] = useState(false);
    // const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        nameInput: false,
        passInput: false,
    });

    useBrowserTitle("Sign Up");

    // useEffect(() => {
    //     firebaseUI = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
    //     if (firebaseUI && !userAuthState) {
    //         firebaseUI.start('#firebaseui-auth-container', uiConfig);
    //     }
    // }, [])

    /**
     * Display alert indicating status of sign up attempt
     * @param {*} type
     */
    const displaySignupAlert = (type) => {
        const showLoginToast = true;
        if (type === C.SUCCESS) {
            const loginSuccessAlert = {
                message: "Successfully logged in :)",
                open: showLoginToast,
                type: C.SUCCESS,
            };
            dispatch(setAlert(loginSuccessAlert));
            // setAlertType(C.SUCCESS);
            // setTimeout(() => {
            //     setShowAlert(false);

            //     // Redirect user to their home page after
            //     navigate("/create", { replace: true });
            // }, 1000);
            // return;
        }
        if (type === C.ERROR) {
            // setAlertType(C.ERROR);
            // setTimeout(() => {
            //     setShowAlert(false);
            // }, 500);
            // return;
        }
        return;
    };

    const checkIfInputEmpty = (event) => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    };

    /* Function for handling standard email/password signup method 
       Will likely have signup functions for Google OAuth
    */
    const handleSignup = async () => {
        if (
            enteredEmail?.trim() &&
            enteredUsername?.trim() &&
            enteredPass?.trim()
        ) {
            try {
                const auth = getAuth();
                createUserWithEmailAndPassword(auth, enteredEmail, enteredPass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        // TODO: There's some refresh + access token stuff in the userCredential object
                        const { uid } = user;
                        console.log(
                            "userCredential upon user sign up = ",
                            userCredential
                        );

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
    };

    /**
     * Checks if the enter key was pressed, calls sign up function
     * @param {*} e
     */
    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleSignup();
        }
    };

    const onPwdFieldClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    return (
        <SignupPageContainer>
            <Paper elevation={6}>
                <SignupContainer onKeyPress={enterKeyHandler}>
                    <SignupTitle variant="h5">Sign up</SignupTitle>

                    <SignupField
                        label="Email"
                        name="emailInput"
                        value={enteredEmail}
                        onBlur={(e) => checkIfInputEmpty(e)}
                        onChange={(e) => setEnteredEmail(e.target.value)}
                        helperText={
                            showErrorText.emailInput && "An email is required"
                        }
                        error={showErrorText.emailInput}
                        size="small"
                    />
                    <SignupField
                        label="Username"
                        name="nameInput"
                        value={enteredUsername}
                        onChange={(e) => setEnteredUsername(e.target.value)}
                        onBlur={(e) => checkIfInputEmpty(e)}
                        helperText={
                            showErrorText.nameInput && "A username is required"
                        }
                        error={showErrorText.nameInput}
                        size="small"
                    />
                    <SignupField
                        label="Password"
                        name="passInput"
                        type={passVisibility ? "text" : "password"}
                        value={enteredPass}
                        onChange={(e) => setEnteredPass(e.target.value)}
                        onBlur={(e) => checkIfInputEmpty(e)}
                        helperText={
                            showErrorText.passInput && "A password is required"
                        }
                        error={showErrorText.passInput}
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <PasswordToggle
                                    passwordVisibility={passVisibility}
                                    setPasswordVisibility={setPassVisibility}
                                />
                            ),
                        }}
                        onClick={onPwdFieldClick}
                    />
                    <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                            vertical: "center",
                            horizontal: "right",
                        }}
                        // transformOrigin={{
                        //     vertical: "top",
                        //     horizontal: "center",
                        // }}
                        disableAutoFocus
                    >
                        <Box p={2}>
                            <BoldHeading variant="subtitle1">
                                Password requirements:
                            </BoldHeading>
                            <Typography>
                                &bull; Must be at least 8 characters long
                            </Typography>
                            <Typography>
                                &bull; Must contain at least one uppercase
                                letter
                            </Typography>
                            <Typography>
                                &bull; Must contain at least one special
                                character
                            </Typography>
                            <Typography>
                                &bull; Must contain at least one lowercase
                                letter
                            </Typography>
                            <Typography>
                                &bull; Must contain at least one number
                            </Typography>
                        </Box>
                    </Popover>
                    <SignupButton
                        variant="contained"
                        disabled={enteredEmail === "" || enteredPass === ""}
                        onClick={() => handleSignup()}
                    >
                        Sign Up
                    </SignupButton>
                    <StyledLink to="/login">
                        Already have an account? Click here to login!
                    </StyledLink>
                </SignupContainer>
            </Paper>
        </SignupPageContainer>
    );
};

export default Signup;
