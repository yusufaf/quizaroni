import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import { requestPasswordReset } from 'shared/auth/session/sessionClient';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { authErrorMessage } from 'views/Login/authErrorMessage';
import {
    LoginContainer,
    LoginPageContainer,
    LoginTitle,
} from 'views/Login/LoginStyles';

// Self-host only. The confirmation is the same whether or not the email has
// an account, and covers servers that don't send email.
const ForgotPasswordForm = () => {
    const { t } = useTranslation('auth');
    useBrowserTitle(PAGE_TITLES.FORGOT_PASSWORD);
    const [email, setEmail] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = email.trim();
        setPending(true);
        setError(null);
        try {
            await requestPasswordReset(trimmed);
            setSentTo(trimmed);
        } catch (err) {
            setError(authErrorMessage(err, t));
        } finally {
            setPending(false);
        }
    };

    return (
        <LoginPageContainer role="page">
            <Paper elevation={6}>
                <LoginContainer>
                    <LoginTitle variant="h5" as="h1">
                        {t('forgot.title')}
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
                        {sentTo !== null ? (
                            <Alert severity="success" role="status">
                                {t('forgot.sent', { email: sentTo })}
                            </Alert>
                        ) : (
                            <>
                                <Typography variant="body2">
                                    {t('forgot.intro')}
                                </Typography>
                                <TextField
                                    id="forgot-email"
                                    label={t('fields.email')}
                                    type="email"
                                    autoComplete="email"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={pending}
                                >
                                    {t('forgot.submit')}
                                </Button>
                            </>
                        )}
                        <Typography variant="body2">
                            <Link component={RouterLink} to="/login">
                                {t('forgot.backToLogin')}
                            </Link>
                        </Typography>
                    </Box>
                </LoginContainer>
            </Paper>
        </LoginPageContainer>
    );
};

export default ForgotPasswordForm;
