import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Divider, SvgIcon } from '@mui/material';
// The ESM build: the bare deep path resolves to the CommonJS file, whose
// default import is the module object in the production bundle (React #130).
import GitHub from '@mui/icons-material/esm/GitHub';
import {
    startSocialSignIn,
    type SocialProvider,
} from 'shared/auth/session/sessionClient';
import { toReturnPath } from 'shared/utilities/returnPath';
import { useAuthProviders } from 'state/api/authProvidersAPI';
import { authErrorMessage } from './authErrorMessage';

const GoogleIcon = () => (
    <SvgIcon viewBox="0 0 48 48" aria-hidden focusable="false">
        <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
    </SvgIcon>
);

const PROVIDERS: Record<SocialProvider, { label: string; icon: ReactNode }> = {
    google: { label: 'Google', icon: <GoogleIcon /> },
    github: { label: 'GitHub', icon: <GitHub aria-hidden /> },
};

// The server rejects callback URLs holding an encoded slash or backslash.
const callbackPath = (from: unknown): string => {
    const path = toReturnPath(from) ?? '/';
    return /%2f|%5c/i.test(path) ? '/' : path;
};

type Props = {
    mode: 'login' | 'signup';
    onError: (message: string | null) => void;
};

// Provider buttons for the self-host sign-in and sign-up forms. They render
// only for the providers the server has set up.
const SocialSignIn = ({ mode, onError }: Props) => {
    const { t } = useTranslation('auth');
    const location = useLocation();
    const available = useAuthProviders();
    const [pending, setPending] = useState(false);

    // Back from the provider's page can restore this page as it was left.
    useEffect(() => {
        const reset = (event: PageTransitionEvent) => {
            if (event.persisted) setPending(false);
        };
        window.addEventListener('pageshow', reset);
        return () => window.removeEventListener('pageshow', reset);
    }, []);

    if (!available || available.providers.length === 0) return null;
    if (mode === 'signup' && !available.registrationOpen) return null;

    const begin = async (provider: SocialProvider) => {
        setPending(true);
        onError(null);
        try {
            const url = await startSocialSignIn({
                provider,
                callbackURL: callbackPath(location.state?.from),
                errorCallbackURL: mode === 'signup' ? '/signUp' : '/login',
                ...(mode === 'signup' ? { requestSignUp: true } : {}),
            });
            window.location.assign(url);
        } catch (err) {
            onError(authErrorMessage(err, t));
            setPending(false);
        }
    };

    return (
        <Box sx={{ mt: 2, minWidth: { sm: 360 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {available.providers.map((provider) => (
                    <Button
                        key={provider}
                        type="button"
                        variant="outlined"
                        fullWidth
                        disabled={pending}
                        startIcon={PROVIDERS[provider].icon}
                        onClick={() => void begin(provider)}
                    >
                        {t('social.continueWith', {
                            provider: PROVIDERS[provider].label,
                        })}
                    </Button>
                ))}
            </Box>
            <Divider sx={{ mt: 2 }}>{t('social.or')}</Divider>
        </Box>
    );
};

export default SocialSignIn;
