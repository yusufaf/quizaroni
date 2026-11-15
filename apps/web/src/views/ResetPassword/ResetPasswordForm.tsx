import { FormEvent, useState } from 'react';
import {
    Link as RouterLink,
    useNavigate,
    useSearchParams,
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
import { resetPassword } from 'shared/auth/session/sessionClient';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { authErrorMessage } from 'views/Login/authErrorMessage';
import {
    LoginContainer,
    LoginPageContainer,
    LoginTitle,
} from 'views/Login/LoginStyles';
import { passwordLengthOk } from 'views/Login/passwordRules';

type FieldErrors = Partial<Record<'password' | 'confirm', string>>;

// Self-host only: the page a reset link opens.
const ResetPasswordForm = () => {
    const { t } = useTranslation('auth');
    useBrowserTitle(PAGE_TITLES.RESET_PASSWORD);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        const errors: FieldErrors = {};
        if (!passwordLengthOk(password)) {
            errors.password = t('errors.passwordLength');
        }
        if (confirm !== password) errors.confirm = t('errors.passwordMismatch');
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setPending(true);
        try {
            await resetPassword({ token, newPassword: password });
            navigate('/login', {
                replace: true,
                state: { notice: 'passwordReset' },
            });
        } catch (err) {
            setError(authErrorMessage(err, t));
            setPending(false);
        }
    };

    const forgotLink = (
        <Typography variant="body2">
            <Link component={RouterLink} to="/forgot-password">
                {t('reset.requestNew')}
            </Link>
        </Typography>
    );

    return (
        <LoginPageContainer role="page">
            <Paper elevation={6}>
                <LoginContainer>
                    <LoginTitle variant="h5" as="h1">
                        {t('reset.title')}
                    </LoginTitle>
                    {token === '' ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                mt: 2,
                            }}
                        >
                            <Alert severity="error" role="alert">
                                {t('errors.resetLinkInvalid')}
                            </Alert>
                            {forgotLink}
                        </Box>
                    ) : (
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
                                id="reset-password"
                                label={t('reset.newPassword')}
                                type="password"
                                autoComplete="new-password"
                                required
                                autoFocus
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                error={Boolean(fieldErrors.password)}
                                helperText={
                                    fieldErrors.password ?? t('hints.password')
                                }
                            />
                            <TextField
                                id="reset-confirm"
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
                                {t('reset.submit')}
                            </Button>
                            {error && forgotLink}
                        </Box>
                    )}
                </LoginContainer>
            </Paper>
        </LoginPageContainer>
    );
};

export default ResetPasswordForm;
