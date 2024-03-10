import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Paper } from "@mui/material/";
import PasswordToggle from "components/PasswordToggle/PasswordToggle";
import { useTheme } from "theme/useTheme";
import { PAGE_TITLES } from "utilities/constants";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import {
    ForgotPasswordLink,
    LoginPageContainer,
    LoginContainer,
    LoginField,
    LoginTitle,
    LoginButton,
} from "./LoginStyles";
import { StyledLink } from "common/AppStyles";
import { useDispatch, useSelector } from "react-redux";
import {
    setCognitoUser,
    setAuthenticated,
    setUserData,
} from "state/slices/globalSlice";
import { selectStudySets, setStudySets } from "state/slices/studysetsSlice";
import { signIn } from "@aws-amplify/auth";
import axios from "axios";
import { useGetAllStudysetsQuery } from "state/api/studysetsAPI";

type Props = {};

const Login = (props: Props) => {
    const { isDarkMode, theme } = useTheme();

    useBrowserTitle(PAGE_TITLES.LOGIN);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    /* OAuth Variables */
    // const provider = new GoogleAuthProvider();
    // provider.setCustomParameters({ prompt: 'select_account' });

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [passVisibility, setPassVisibility] = useState<boolean>(false);
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        passInput: false,
    });

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
            const user = await signIn({ username, password });
            console.log("Result of cognito sign in = ", user);

            /* Retrieve user data, passing username as a query parameter */
            const response = await axios.get("/api/users/get", {
                params: {
                    username,
                },
            });
            console.log({ response, user });
            const userData = response.data;

            /* Store cognito user and authenticated in state */
            dispatch(setCognitoUser({username}));
            dispatch(setAuthenticated(true));
            // dispatch(setUserData(userData));

            // Navigate to home page
            navigate("/");
        } catch (error) {
            console.error("Error signing in", error);
        }
    };

    /* Function to check if "Enter" key was hit and call function */
    const enterKeyHandler = (e) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleLogin();
        }
    };

    const handleEmailChange = (e) => {
        setUsername(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    return (
        <>
            <LoginPageContainer role="page">
                <Paper elevation={6}>
                    <LoginContainer onKeyUp={enterKeyHandler}>
                        <LoginTitle variant="h5">Login</LoginTitle>
                        <LoginField
                            label="Email or username"
                            name="emailInput"
                            value={username}
                            onChange={handleEmailChange}
                            error={showErrorText.emailInput}
                            size="small"
                        />
                        <LoginField
                            label="Password"
                            type={passVisibility ? "text" : "password"}
                            value={password}
                            name="passInput"
                            onChange={handlePasswordChange}
                            error={showErrorText.passInput}
                            size="small"
                            InputProps={{
                                endAdornment: (
                                    <PasswordToggle
                                        passwordVisibility={passVisibility}
                                        setPasswordVisibility={
                                            setPassVisibility
                                        }
                                    />
                                ),
                            }}
                        />
                        <ForgotPasswordLink to="/forgotPassword">
                            Forgot password?
                        </ForgotPasswordLink>
                        <LoginButton
                            variant="contained"
                            disabled={!username || !password}
                            onClick={() => handleLogin()}
                        >
                            Log In
                        </LoginButton>
                        <StyledLink to="/signup">
                            Don't have an account? Click here to sign up!
                        </StyledLink>
                    </LoginContainer>
                </Paper>
            </LoginPageContainer>
        </>
    );
};

export default Login;
