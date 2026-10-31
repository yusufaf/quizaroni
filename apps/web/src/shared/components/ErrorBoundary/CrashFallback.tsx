import { Box, Button, Stack, Typography } from '@mui/material';
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
            <Stack direction="row" spacing={1} justifyContent="center">
                {needRefresh && (
                    // registerSW reloads the page once the new worker takes
                    // control.
                    <Button
                        variant="contained"
                        onClick={() => void skipWaiting()}
                    >
                        {t('errorBoundary.updateAndReload')}
                    </Button>
                )}
                {/* Still offered with an update waiting, in case the new
                    worker never takes control. */}
                <Button
                    variant={needRefresh ? 'text' : 'contained'}
                    onClick={() => window.location.reload()}
                >
                    {t('pwa.reload')}
                </Button>
            </Stack>
        </Box>
    );
};

export default CrashFallback;
