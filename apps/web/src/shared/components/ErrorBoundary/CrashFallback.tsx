import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePwaStore } from 'state/stores/pwa';
import { skipWaiting } from 'state/local/pwa/registerSW';

/**
 * A fix for the crash may already be installed and waiting: the PWA registers
 * with `registerType: 'prompt'`, so a new version only takes over once asked.
 */
const CrashFallback = () => {
    const { t } = useTranslation();
    const needRefresh = usePwaStore((state) => state.needRefresh);

    return (
        <Box
            role="alert"
            sx={{
                maxWidth: '32rem',
                marginX: 'auto',
                paddingX: 2,
                paddingY: 8,
                textAlign: 'center',
            }}
        >
            <Typography component="h1" variant="h5" gutterBottom>
                {t('errorBoundary.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ marginBottom: 3 }}>
                {needRefresh
                    ? t('errorBoundary.updateBody')
                    : t('errorBoundary.body')}
            </Typography>
            {needRefresh ? (
                // registerSW reloads the page once the new worker takes control.
                <Button variant="contained" onClick={() => void skipWaiting()}>
                    {t('errorBoundary.updateAndReload')}
                </Button>
            ) : (
                <Button
                    variant="contained"
                    onClick={() => window.location.reload()}
                >
                    {t('pwa.reload')}
                </Button>
            )}
        </Box>
    );
};

export default CrashFallback;
