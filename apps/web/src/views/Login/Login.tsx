import { useEffect } from 'react';
import { Paper } from '@mui/material/';
import { useLogto } from '@logto/react';
import { PAGE_TITLES } from 'shared/constants';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { LoginPageContainer, LoginContainer, LoginTitle } from './LoginStyles';

type Props = {};

// Logto has no embeddable sign-in form (unlike Amplify's <Authenticator>) —
// it redirects to its own hosted sign-in page. This view's only job is to
// kick off that redirect; /callback (Callback.tsx) picks the user back up.
const Login = (props: Props) => {
    useBrowserTitle(PAGE_TITLES.LOGIN);
    const { signIn, isAuthenticated } = useLogto();

    useEffect(() => {
        if (!isAuthenticated) {
            signIn(`${window.location.origin}/callback`);
        }
    }, [isAuthenticated, signIn]);

    return (
        <LoginPageContainer role="page">
            <Paper elevation={6}>
                <LoginContainer>
                    <LoginTitle variant="h5">
                        Redirecting to sign in...
                    </LoginTitle>
                </LoginContainer>
            </Paper>
        </LoginPageContainer>
    );
};

export default Login;
