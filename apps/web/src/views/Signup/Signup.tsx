import { useEffect } from 'react';
import { Paper } from '@mui/material/';
import { useLogto } from '@logto/react';
import { PAGE_TITLES } from 'shared/constants';
import useBrowserTitle from 'hooks/useBrowserTitle';
import {
    LoginContainer as SignupContainer,
    LoginPageContainer as SignupPageContainer,
    LoginTitle as SignupTitle,
} from 'views/Login/LoginStyles';

type Props = {};

// Same shape as Login.tsx, kicking off the 'signUp' interaction mode so
// Logto's hosted page opens on its registration screen instead of sign-in.
const Signup = (props: Props) => {
    useBrowserTitle(PAGE_TITLES.SIGN_UP);
    const { signIn, isAuthenticated } = useLogto();

    useEffect(() => {
        if (!isAuthenticated) {
            signIn(`${window.location.origin}/callback`, 'signUp');
        }
    }, [isAuthenticated, signIn]);

    return (
        <SignupPageContainer role="page">
            <Paper elevation={6}>
                <SignupContainer>
                    <SignupTitle variant="h5">
                        Redirecting to sign up...
                    </SignupTitle>
                </SignupContainer>
            </Paper>
        </SignupPageContainer>
    );
};

export default Signup;
