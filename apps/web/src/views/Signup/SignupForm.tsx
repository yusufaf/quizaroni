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
import { authErrorMessage } from 'views/Login/authErrorMessage';
import {
    LoginContainer as SignupContainer,
    LoginPageContainer as SignupPageContainer,
    LoginTitle as SignupTitle,
} from 'views/Login/LoginStyles';

// Better Auth's limits, measured in UTF-16 code units like the server.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 100;

type FieldErrors = Partial<Record<'name' | 'password' | 'confirm', string>>;

// The self-host sign-up form; the AWS build redirects to Logto (Signup.tsx).
const SignupForm = () => {
    const { t } = useTranslation('auth');
    useBrowserTitle(PAGE_TITLES.SIGN_UP);
    const { isAuthenticated, signUp } = useSession();
    const location = useLocation();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (isAuthenticated && !pending) return <Navigate to="/" replace />;

    const validate = (): FieldErrors => {
        const errors: FieldErrors = {};
        const trimmed = name.trim();
        if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
            errors.name = t('errors.nameRequired');
        }
        if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
            errors.password = t('errors.passwordLength');
        }
        if (confirm !== password) errors.confirm = t('errors.passwordMismatch');
        return errors;
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        const errors = validate();
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setPending(true);
        try {
            await signUp({ name: name.trim(), email: email.trim(), password });
            navigate(toReturnPath(location.state?.from) ?? '/', {
                replace: true,
            });
        } catch (err) {
            setError(authErrorMessage(err, t));
            setPending(false);
        }
    };

    return (
        <SignupPageContainer role="page">
            <Paper elevation={6}>
                <SignupContainer>
                    <SignupTitle variant="h5" as="h1">
                        {t('signup.title')}
                    </SignupTitle>
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
                            id="signup-name"
                            label={t('fields.name')}
                            autoComplete="name"
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                        />
                        <TextField
                            id="signup-email"
                            label={t('fields.email')}
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            id="signup-password"
                            label={t('fields.password')}
                            type="password"
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={Boolean(fieldErrors.password)}
                            helperText={
                                fieldErrors.password ?? t('hints.password')
                            }
                        />
                        <TextField
                            id="signup-confirm"
                            label={t('fields.confirmPassword')}
                            type="password"
                            autoComplete="new-password"
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            error={Boolean(fieldErrors.confirm)}
                            helperText={fieldErrors.confirm}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={pending}
                        >
                            {t('signup.submit')}
                        </Button>
                        <Typography variant="body2">
                            {t('signup.haveAccount')}{' '}
                            <Link
                                component={RouterLink}
                                to="/login"
                                state={location.state}
                            >
                                {t('signup.loginLink')}
                            </Link>
                        </Typography>
                    </Box>
                </SignupContainer>
            </Paper>
        </SignupPageContainer>
    );
};

export default SignupForm;
