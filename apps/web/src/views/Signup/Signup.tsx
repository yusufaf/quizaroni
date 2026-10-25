import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Paper } from '@mui/material/';
import { useLogto } from '@logto/react';
import { useTranslation } from 'react-i18next';
import { PAGE_TITLES } from 'shared/constants';
import { rememberReturnPath } from 'shared/utilities/returnPath';
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
    const { t } = useTranslation('auth');
    useBrowserTitle(PAGE_TITLES.SIGN_UP);
    const { signIn, isAuthenticated } = useLogto();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) {
            // Sign-up CTAs (Explore's banner) pass a return path as router state.
            rememberReturnPath(location.state);
            signIn(`${window.location.origin}/callback`, 'signUp');
        }
    }, [isAuthenticated, signIn, location.state]);

    return (
        <SignupPageContainer role="page">
            <Paper elevation={6}>
                <SignupContainer>
                    <SignupTitle variant="h5">
                        {t('redirectingToSignUp')}
                    </SignupTitle>
                </SignupContainer>
            </Paper>
        </SignupPageContainer>
    );
};

export default Signup;
