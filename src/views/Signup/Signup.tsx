import { useEffect, useState } from "react";
import { Box, Paper, Popover, Typography } from "@mui/material/";
import { useNavigate } from "react-router-dom";
import PasswordToggle from "components/PasswordToggle/PasswordToggle";
import * as C from "utilities/constants";
import { useTheme } from "theme/useTheme";
import { BoldTypography } from "common/AppStyles";
import {
    LoginButton as SignupButton,
    LoginContainer as SignupContainer,
    LoginField as SignupField,
    LoginPageContainer as SignupPageContainer,
    LoginTitle as SignupTitle,
} from "views/Login/LoginStyles";
import { StyledLink } from "common/AppStyles";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import { useDispatch } from "react-redux";
import { setAlert, setCognitoUser } from "state/slices/global";
import { Auth } from "@aws-amplify/auth";
import axios from "axios";
import PasswordValidator from "components/PasswordValidator/PasswordValidator";

type Props = {};

const Signup = (props: Props) => {
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

    const [passwordValid, setPasswordValid] = useState<boolean>(false);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        nameInput: false,
        passInput: false,
    });

    useBrowserTitle("Sign Up");

    const handlePasswordChange = (e: any) => {
        setPassword(e.target.value);
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

            // @ts-ignore - storage should exist on a newly created cognito user
            
            const { userInfo } = user.storage;
            const { createdAt, emailVerified, uid } = JSON.parse(userInfo);
            const newUserData = {
                createdAt: Number.parseInt(createdAt),
                username,
                email,
                emailVerified,
                uid,
            };

            /* Store newly created cognito user in Redux */
            // dispatch(
            //     setCognitoUser({
            //         username,
            //     })
            // );

            /* Send user to confirm email page */
            navigate("/confirmEmail");

            const response = await axios.post("/api/users/create", newUserData);
            console.log({ response });

            // Response.data has message in it
        } catch (error) {
            console.log("error signing up:", error);
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
                    <PasswordValidator
                        setIsPasswordValid={setPasswordValid}
                        password={password}
                    />
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
