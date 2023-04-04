import { useEffect, useState } from "react";
import { Box, Paper, Popover, Typography } from "@mui/material/";
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
import {
    PasswordPolicyBox,
    PasswordPolicyPaper,
    RequirementText,
} from "./styles";
import axios from "axios";

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

            // @ts-ignore - pool should exist on a newly created cognito user
            const { clientId = "" } = user.pool;
            // @ts-ignore - storage should exist on a newly created cognito user
            const { userInfo } = user.storage;
            const { emailVerified, uid } = userInfo;
            const createdAt = new Date().getTime();

            const newUserData = {
                createdAt,
                username,
                email,
                emailVerified,
                clientId,
                uid,
            };
            const response = await axios.post("/api/users/create", newUserData);
            console.log({ response });

            
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

                    <PasswordPolicyBox>
                        <PasswordPolicyPaper elevation={6}>
                            <BoldHeading
                                variant="subtitle1"
                                sx={{ textAlign: "center" }}
                            >
                                Password Policy:
                            </BoldHeading>
                            <RequirementText
                                isSatisfied={requirementState.length}
                            >
                                &bull; Must be at least 8 characters long
                            </RequirementText>
                            <RequirementText
                                isSatisfied={requirementState.uppercase}
                            >
                                &bull; Must contain at least one uppercase
                                letter
                            </RequirementText>
                            <RequirementText
                                isSatisfied={requirementState.special}
                            >
                                &bull; Must contain at least one special
                                character
                            </RequirementText>
                            <RequirementText
                                isSatisfied={requirementState.lowercase}
                            >
                                &bull; Must contain at least one lowercase
                                letter
                            </RequirementText>
                            <RequirementText
                                isSatisfied={requirementState.number}
                            >
                                &bull; Must contain at least one number
                            </RequirementText>
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
