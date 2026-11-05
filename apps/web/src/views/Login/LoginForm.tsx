import { FormEvent, useState } from 'react';
import {
    Link as RouterLink,
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Link,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { PAGE_TITLES } from 'shared/constants';
import { useSession } from 'shared/auth/session/SessionProvider';
import { toReturnPath } from 'shared/utilities/returnPath';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { authErrorMessage } from './authErrorMessage';
import { LoginContainer, LoginPageContainer, LoginTitle } from './LoginStyles';

// The self-host sign-in form; the AWS build redirects to Logto (Login.tsx).
const LoginForm = () => {
    const { t } = useTranslation('auth');
    useBrowserTitle(PAGE_TITLES.LOGIN);
    const { isAuthenticated, signIn } = useSession();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (isAuthenticated && !pending) return <Navigate to="/" replace />;

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
            await signIn({ email: email.trim(), password });
            navigate(toReturnPath(location.state?.from) ?? '/', {
                replace: true,
            });
        } catch (err) {
            setError(authErrorMessage(err, t));
            setPending(false);
        }
    };

    return (
        <LoginPageContainer role="page">
            <Paper elevation={6}>
                <LoginContainer>
                    <LoginTitle variant="h5" as="h1">
                        {t('login.title')}
                    </LoginTitle>
                    <Box
                        component="form"
                        noValidate
                        onSubmit={onSubmit}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            mt: 2,
                            minWidth: { sm: 360 },
                        }}
                    >
                        {error && (
                            <Alert severity="error" role="alert">
                                {error}
                            </Alert>
                        )}
                        <TextField
                            id="login-email"
                            label={t('fields.email')}
                            type="email"
                            autoComplete="username"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            id="login-password"
                            label={t('fields.password')}
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={pending}
                        >
                            {t('login.submit')}
                        </Button>
                        <Typography variant="body2">
                            {t('login.noAccount')}{' '}
                            <Link
                                component={RouterLink}
                                to="/signUp"
                                state={location.state}
                            >
                                {t('login.signUpLink')}
                            </Link>
                        </Typography>
                    </Box>
                </LoginContainer>
            </Paper>
        </LoginPageContainer>
    );
};

export default LoginForm;
