import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePwaStore } from 'state/stores/pwa';
import { skipWaiting } from 'state/local';

const TOAST_ID = 'pwa-update-available';

/**
 * Shows a persistent toast prompting the user to reload when a new service
 * worker version has been installed and is waiting to activate. Mounted once
 * near the app root, alongside <ToastContainer />.
 */
const PwaUpdateToast = () => {
    const { t } = useTranslation();
    const needRefresh = usePwaStore((state) => state.needRefresh);
    const shown = useRef(false);

    useEffect(() => {
        if (!needRefresh || shown.current) return;
        shown.current = true;

        const reload = async () => {
            toast.dismiss(TOAST_ID);
            // skipWaiting() only fires the skip-waiting postMessage; it
            // resolves before the new SW has actually taken control.
            // vite-plugin-pwa's registerSW already reloads the page itself
            // once the 'controlling' event confirms the new SW is active -
            // reloading here too would race ahead of that and can still
            // serve the outgoing (stale) worker.
            await skipWaiting();
        };

        toast.info(
            <div>
                <div>{t('pwa.updateAvailable')}</div>
                <Button
                    size="small"
                    color="inherit"
                    onClick={() => void reload()}
                    sx={{ mt: 1 }}
                >
                    {t('pwa.reload')}
                </Button>
            </div>,
            {
                toastId: TOAST_ID,
                autoClose: false,
                closeOnClick: false,
            }
        );
    }, [needRefresh, t]);

    return null;
};

export default PwaUpdateToast;
