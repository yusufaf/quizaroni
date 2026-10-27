import { Button, Paper, Typography } from '@mui/material';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation } from 'react-router-dom';

/**
 * Shown to logged-out visitors in place of For you (#139). The current path
 * rides along as router state, so sign-up returns here (see Signup.tsx).
 */
const SignUpBanner = () => {
    const { t } = useTranslation('explore');
    const headingId = useId();
    const location = useLocation();

    return (
        <Paper
            elevation={0}
            component="section"
            aria-labelledby={headingId}
            sx={{
                p: { xs: 3, sm: 4 },
                bgcolor: 'action.hover',
                borderRadius: 2,
            }}
        >
            <Typography
                component="h2"
                variant="h6"
                fontWeight={700}
                id={headingId}
            >
                {t('signUpBanner.heading')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                {t('signUpBanner.body')}
            </Typography>
            <Button
                variant="contained"
                component={RouterLink}
                to="/signUp"
                state={{ from: location.pathname + location.search }}
            >
                {t('signUpBanner.cta')}
            </Button>
        </Paper>
    );
};

export default SignUpBanner;
