import { useEffect, useState } from 'react';
import { Box, Paper, Popover, Typography } from '@mui/material/';
import { useNavigate } from 'react-router-dom';
import PasswordToggle from 'components/PasswordToggle/PasswordToggle';
import { PAGE_TITLES } from 'shared/constants';
import { BoldTypography } from 'styles/AppStyles';
import {
    LoginButton as SignupButton,
    LoginContainer as SignupContainer,
    LoginField as SignupField,
    LoginPageContainer as SignupPageContainer,
    LoginTitle as SignupTitle,
} from 'views/Login/LoginStyles';
import { StyledLink } from 'styles/AppStyles';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { signUp } from '@aws-amplify/auth';
import PasswordValidator from 'components/PasswordValidator/PasswordValidator';
import { useCreateUser } from 'state/api/usersAPI';
import { useGlobalStore } from 'state/stores/global';

type Props = {};

const Signup = (props: Props) => {
    // const auth = getAuth();
    // const provider = new GoogleAuthProvider();
    // provider.setCustomParameters({ prompt: "select_account" });

    const navigate = useNavigate();
    const { mutate: createUser } = useCreateUser();
    const { setConfirmationCodeDialogProps } = useGlobalStore();

    /* Signup Input States */
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    const [username, setUsername] = useState<string>('');
    const [passVisibility, setPassVisibility] = useState<boolean>(false);

    const [passwordValid, setPasswordValid] = useState<boolean>(false);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        nameInput: false,
        passInput: false,
    });

    useBrowserTitle(PAGE_TITLES.SIGN_UP);

    const handlePasswordChange = (e: any) => {
        setPassword(e.target.value);
    };

    const handleSignup = async () => {
        /* Sign up button is disabled until fields are valid */
        try {
            const signUpResult = await signUp({
                username,
                password,
                options: {
                    userAttributes: {
                        email,
                    },
                    autoSignIn: {
                        enabled: true,
                    },
                },
            });
            console.log({ signUpResult });

            /* Store newly created cognito user in Redux */
            // dispatch(
            //     setCognitoUser({
            //         username,
            //     })
            // );

            createUser({
                email,
                username,
            });

            setConfirmationCodeDialogProps({
                open: true,
                actionType: 'signUp',
                title: 'Confirm Sign Up',
            });
        } catch (error) {
            console.log('error signing up:', error);
        }
    };

    /**
     * Checks if the enter key was pressed, calls sign up function
     * @param {*} e
     */
    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === 'Enter') {
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
                <SignupContainer onKeyUp={enterKeyHandler}>
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
                        type={passVisibility ? 'text' : 'password'}
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
                    {password.length !== 0 && (
                        <PasswordValidator
                            isPasswordValid={passwordValid}
                            setIsPasswordValid={setPasswordValid}
                            password={password}
                            style={{
                                marginTop: '0.5rem',
                            }}
                        />
                    )}
                    <SignupField
                        label="Confirm Password"
                        name="passInput"
                        type={passVisibility ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        helperText={
                            showErrorText.passInput && 'A password is required'
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
