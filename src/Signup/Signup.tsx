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
import { Auth } from "@aws-amplify/auth";
import { PasswordPolicyBox, PasswordPolicyPaper } from "./styles";

// Define regex patterns for each requirement
const REGEX_PATTERNS = {
    uppercase: /(?=.*[A-Z])/,
    special: /(?=.*[!@#$%^&*])/,
    lowercase: /(?=.*[a-z])/,
    number: /(?=.*[0-9])/,
    length: /^.{8,}$/,
};

type RequirementState = {
    length: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    uppercase: boolean;
};

const initialRequirementState: RequirementState = {
    length: false,
    lowercase: false,
    number: false,
    special: false,
    uppercase: false,
};

const Signup = (props) => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    // const auth = getAuth();
    // const provider = new GoogleAuthProvider();
    // provider.setCustomParameters({ prompt: "select_account" });

    const dispatch = useDispatch();
    const navigate = useNavigate();

    /* Signup Input States */
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [username, setUsername] = useState<string>("");
    const [passVisibility, setPassVisibility] = useState<boolean>(false);

    const [requirementState, setRequirementState] = useState<RequirementState>({
        ...initialRequirementState,
    });
    const [passwordValid, setPasswordValid] = useState<boolean>(false);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        nameInput: false,
        passInput: false,
    });

    useBrowserTitle("Sign Up");

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
        }
        if (type === C.ERROR) {
        }
        return;
    };

    const isPasswordValid = (password: string) => {
        const newReqState = { ...requirementState };
        Object.keys(REGEX_PATTERNS).forEach((key) => {
            newReqState[key] = REGEX_PATTERNS[key].test(password);
        });
        setRequirementState(newReqState);
        return Object.values(newReqState).every(Boolean);
    };

    const handlePasswordChange = (e: any) => {
        setPassword(e.target.value);
        setPasswordValid(isPasswordValid(e.target.value));
    };

    const handleSignup = async () => {
        /* Sign up button is disabled until fields are valid */
        try {
            const { user } = await Auth.signUp({
                username,
                password,
                attributes: {
                    email,
                },
                autoSignIn: {
                    enabled: true,
                },
            });
            console.log(user);
            /* Result of user object:
            {
    "username": "lookatme",
    "pool": {
        "userPoolId": "us-west-2_Xa6XFcAJY",
        "clientId": "4u3r3c9f5qgacaftsu7simlj1c",
        "client": {
            "endpoint": "https://cognito-idp.us-west-2.amazonaws.com/",
            "fetchOptions": {}
        },
        "advancedSecurityDataCollectionFlag": true,
        "storage": {
            "userInfo": "{\"uid\":\"b13MYkG0GlPlSiyENneUM9ZvkJr1\",\"email\":\"evil.elmo5@gmail.com\",\"emailVerified\":false,\"isAnonymous\":false,\"providerData\":[{\"providerId\":\"password\",\"uid\":\"evil.elmo5@gmail.com\",\"displayName\":null,\"email\":\"evil.elmo5@gmail.com\",\"phoneNumber\":null,\"photoURL\":null}],\"stsTokenManager\":{\"refreshToken\":\"APJWN8dxv80_3ufi9uDXOpLzP3TcoOdj6uy_UunyGVpXK_pJwTKefiHANhp8RvuqPGVhZRWrG-PilAmvF4iRBCYhoVBDfHYWvRlBZT0J_KZqpTjd5WabN0WwOLV6Pn36DD1wE5yKFcx1KcO3M-6uYKxh9RkS4C363efe0qZt1jFEFlC6zV_UUMDYZeQ-LJ6iDcjVD4gjIS4m\",\"accessToken\":\"eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk3OWVkMTU1OTdhYjM1Zjc4MjljZTc0NDMwN2I3OTNiN2ViZWIyZjAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcXVpemFyb25pIiwiYXVkIjoicXVpemFyb25pIiwiYXV0aF90aW1lIjoxNjgwMjMxODE0LCJ1c2VyX2lkIjoiYjEzTVlrRzBHbFBsU2l5RU5uZVVNOVp2a0pyMSIsInN1YiI6ImIxM01Za0cwR2xQbFNpeUVObmVVTTladmtKcjEiLCJpYXQiOjE2ODAyMzE4MTQsImV4cCI6MTY4MDIzNTQxNCwiZW1haWwiOiJldmlsLmVsbW81QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJldmlsLmVsbW81QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.L9AfKJSFX4LRWZn9fL6dQvVWj5VpTylViMYJyR_Oi2YngR7ky8N_3o9yNxQC1gxYrVjalV9fPCQyfjNzoeFsrpDzAR_xqas6htKsQRYlbzhkHwARi0Mk0JJ9B3EH4zbSwLRA6IEonV37yByKLGVOBKo-0lc1jmhQnWv7OWbCepFy1QUQHfTXEZESXnckLUud0OUpaC5_sTxhehxBvkzf93JAhemdVnsRq_mxgC--lt__oNIDipUqFo6Xh692ep2U_ml6mLdA9tw5CQD-IewnhpGfBmkGHojdCPQGYrpquma4CjNOjumLLcrvFyD3I9kJ8vcAZ76JOIBiMOTy4l1jwA\",\"expirationTime\":1680235414900},\"createdAt\":\"1640382224373\",\"lastLoginAt\":\"1680231814667\",\"apiKey\":\"AIzaSyC2VtoBLdYqJuy1e8e_OlrfgMOdfxRDZzg\",\"appName\":\"[DEFAULT]\"}",
            "appTheme": "dark",
            "amplify-auto-sign-in": "true",
            "debug": "honey:core-sdk:*"
        }
    },
    "Session": null,
    "client": {
        "endpoint": "https://cognito-idp.us-west-2.amazonaws.com/",
        "fetchOptions": {}
    },
    "signInUserSession": null,
    "authenticationFlowType": "USER_SRP_AUTH",
    "storage": {
        "userInfo": "{\"uid\":\"b13MYkG0GlPlSiyENneUM9ZvkJr1\",\"email\":\"evil.elmo5@gmail.com\",\"emailVerified\":false,\"isAnonymous\":false,\"providerData\":[{\"providerId\":\"password\",\"uid\":\"evil.elmo5@gmail.com\",\"displayName\":null,\"email\":\"evil.elmo5@gmail.com\",\"phoneNumber\":null,\"photoURL\":null}],\"stsTokenManager\":{\"refreshToken\":\"APJWN8dxv80_3ufi9uDXOpLzP3TcoOdj6uy_UunyGVpXK_pJwTKefiHANhp8RvuqPGVhZRWrG-PilAmvF4iRBCYhoVBDfHYWvRlBZT0J_KZqpTjd5WabN0WwOLV6Pn36DD1wE5yKFcx1KcO3M-6uYKxh9RkS4C363efe0qZt1jFEFlC6zV_UUMDYZeQ-LJ6iDcjVD4gjIS4m\",\"accessToken\":\"eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk3OWVkMTU1OTdhYjM1Zjc4MjljZTc0NDMwN2I3OTNiN2ViZWIyZjAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcXVpemFyb25pIiwiYXVkIjoicXVpemFyb25pIiwiYXV0aF90aW1lIjoxNjgwMjMxODE0LCJ1c2VyX2lkIjoiYjEzTVlrRzBHbFBsU2l5RU5uZVVNOVp2a0pyMSIsInN1YiI6ImIxM01Za0cwR2xQbFNpeUVObmVVTTladmtKcjEiLCJpYXQiOjE2ODAyMzE4MTQsImV4cCI6MTY4MDIzNTQxNCwiZW1haWwiOiJldmlsLmVsbW81QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJldmlsLmVsbW81QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.L9AfKJSFX4LRWZn9fL6dQvVWj5VpTylViMYJyR_Oi2YngR7ky8N_3o9yNxQC1gxYrVjalV9fPCQyfjNzoeFsrpDzAR_xqas6htKsQRYlbzhkHwARi0Mk0JJ9B3EH4zbSwLRA6IEonV37yByKLGVOBKo-0lc1jmhQnWv7OWbCepFy1QUQHfTXEZESXnckLUud0OUpaC5_sTxhehxBvkzf93JAhemdVnsRq_mxgC--lt__oNIDipUqFo6Xh692ep2U_ml6mLdA9tw5CQD-IewnhpGfBmkGHojdCPQGYrpquma4CjNOjumLLcrvFyD3I9kJ8vcAZ76JOIBiMOTy4l1jwA\",\"expirationTime\":1680235414900},\"createdAt\":\"1640382224373\",\"lastLoginAt\":\"1680231814667\",\"apiKey\":\"AIzaSyC2VtoBLdYqJuy1e8e_OlrfgMOdfxRDZzg\",\"appName\":\"[DEFAULT]\"}",
        "appTheme": "dark",
        "amplify-auto-sign-in": "true",
        "debug": "honey:core-sdk:*"
    },
    "keyPrefix": "CognitoIdentityServiceProvider.4u3r3c9f5qgacaftsu7simlj1c",
    "userDataKey": "CognitoIdentityServiceProvider.4u3r3c9f5qgacaftsu7simlj1c.lookatme.userData"
}

            */
        } catch (error) {
            console.log("error signing up:", error);
        }

        /* 
            On success: Create a new user in Mongo
            TODO: Create user endpoint
        */
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

    const signUpDisabled =
        !email ||
        !username ||
        !password ||
        !confirmPassword ||
        password !== confirmPassword ||
        !passwordValid;

    return (
        <SignupPageContainer>
            <Paper elevation={6}>
                <SignupContainer onKeyPress={enterKeyHandler}>
                    <SignupTitle variant="h5">Sign up</SignupTitle>

                    <SignupField
                        label="Email"
                        name="emailInput"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={showErrorText.emailInput}
                        size="small"
                        required
                    />
                    <SignupField
                        label="Username"
                        name="nameInput"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        error={showErrorText.nameInput}
                        size="small"
                        required
                    />
                    <SignupField
                        label="Password"
                        name="passInput"
                        type={passVisibility ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
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
                        required
                    />
                    <SignupField
                        label="Confirm Password"
                        name="passInput"
                        type={passVisibility ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        required
                    />

                    <PasswordPolicyBox>
                        <PasswordPolicyPaper elevation={6}>
                            <BoldHeading variant="subtitle1" sx={{ textAlign: "center" }}>
                                Password Policy:
                            </BoldHeading>
                            <Typography
                                sx={{
                                    color: requirementState.length
                                        ? "green"
                                        : "red",
                                }}
                            >
                                &bull; Must be at least 8 characters long
                            </Typography>
                            <Typography
                                sx={{
                                    color: requirementState.uppercase
                                        ? "green"
                                        : "red",
                                }}
                            >
                                &bull; Must contain at least one uppercase
                                letter
                            </Typography>
                            <Typography
                                sx={{
                                    color: requirementState.special
                                        ? "green"
                                        : "red",
                                }}
                            >
                                &bull; Must contain at least one special
                                character
                            </Typography>
                            <Typography
                                sx={{
                                    color: requirementState.lowercase
                                        ? "green"
                                        : "red",
                                }}
                            >
                                &bull; Must contain at least one lowercase
                                letter
                            </Typography>
                            <Typography
                                sx={{
                                    color: requirementState.number
                                        ? "green"
                                        : "red",
                                }}
                            >
                                &bull; Must contain at least one number
                            </Typography>
                        </PasswordPolicyPaper>
                    </PasswordPolicyBox>
                    <SignupButton
                        variant="contained"
                        disabled={signUpDisabled}
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
