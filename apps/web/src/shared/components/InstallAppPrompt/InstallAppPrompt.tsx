import { useEffect, useState } from 'react';
import { Snackbar, Button, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { usePwaStore } from 'state/stores/pwa';

function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari exposes this instead of the display-mode media query.
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
            true
    );
}

function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Every iOS browser is a re-skinned WebKit and carries "Safari" in its UA
// (Apple requires it), so this also has to exclude the other browsers' and
// in-app webviews' own UA tokens - not just Chrome/Firefox's - to avoid
// showing Safari's Share-sheet instructions inside a browser that has no
// such Share sheet.
function isSafari(): boolean {
    const ua = window.navigator.userAgent;
    return (
        /safari/i.test(ua) &&
        !/crios|fxios|edgios|opios|opt\/|mercury|duckduckgo|gsa\/|fban|fbav|instagram|line\/|micromessenger|chrome|android/i.test(
            ua
        )
    );
}

/**
 * Prompts the user to install Quizaroni to their home screen. On
 * Android/Chromium this captures beforeinstallprompt and triggers the native
 * install flow; iOS Safari has no such event, so it shows manual
 * Share -> Add to Home Screen instructions instead.
 */
const InstallAppPrompt = () => {
    const { t } = useTranslation();
    const installPromptEvent = usePwaStore((s) => s.installPromptEvent);
    const setInstallPromptEvent = usePwaStore((s) => s.setInstallPromptEvent);
    const installDismissed = usePwaStore((s) => s.installDismissed);
    const dismissInstall = usePwaStore((s) => s.dismissInstall);
    const [installed, setInstalled] = useState(isStandalone());
    const [showIosInstructions, setShowIosInstructions] = useState(false);

    useEffect(() => {
        if (installed) return;

        const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
            event.preventDefault();
            setInstallPromptEvent(event);
        };
        const onAppInstalled = () => {
            setInstalled(true);
            setInstallPromptEvent(null);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                onBeforeInstallPrompt
            );
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, [installed, setInstallPromptEvent]);

    if (installed || installDismissed) return null;

    const canPromptInstall = installPromptEvent !== null;
    const isIosSafari = isIos() && isSafari();
    if (!canPromptInstall && !isIosSafari) return null;

    const handleInstallClick = async () => {
        if (installPromptEvent) {
            await installPromptEvent.prompt();
            await installPromptEvent.userChoice;
            setInstallPromptEvent(null);
        } else if (isIosSafari) {
            setShowIosInstructions(true);
        }
    };

    return (
        <Snackbar
            open
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{
                maxWidth: 420,
                bottom: 'calc(var(--bottom-nav-offset) + 1rem)',
            }}
            message={
                showIosInstructions
                    ? t('pwa.installIosInstructions')
                    : t('pwa.installPrompt')
            }
            action={
                <>
                    {!showIosInstructions && (
                        <Button
                            size="small"
                            color="inherit"
                            onClick={() => void handleInstallClick()}
                        >
                            {t('pwa.install')}
                        </Button>
                    )}
                    <IconButton
                        size="small"
                        color="inherit"
                        aria-label={t('pwa.dismissInstall')}
                        onClick={dismissInstall}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </>
            }
        />
    );
};

export default InstallAppPrompt;
