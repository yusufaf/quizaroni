import { registerSW } from 'virtual:pwa-register';
import { usePwaStore } from 'state/stores/pwa';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

// Caches left behind by the pre-vite-plugin-pwa hand-written service worker
// (CACHE_NAME = 'quizaroni-v2'). Workbox's cleanupOutdatedCaches only reaps
// its own precaches, so returning visitors would otherwise keep this forever.
const LEGACY_CACHE_PREFIX = 'quizaroni-v';

async function purgeLegacyCaches(): Promise<void> {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(
        keys
            .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
            .map((key) => caches.delete(key))
    );
}

export function registerServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;

    void purgeLegacyCaches();

    updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            usePwaStore.getState().setNeedRefresh(true);
        },
        onOfflineReady() {
            console.log('App ready to work offline');
        },
        onRegisteredSW(swUrl, registration) {
            console.log('SW registered:', swUrl, registration?.scope);
        },
        onRegisterError(error) {
            console.log('SW registration failed:', error);
        },
    });
}

export function unregisterServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.ready
            .then((registration) => {
                return registration.unregister();
            })
            .catch(() => false);
    }
    return Promise.resolve(false);
}

// Force update to new version.
export async function skipWaiting(): Promise<void> {
    if (updateSW) {
        await updateSW(true);
        usePwaStore.getState().setNeedRefresh(false);
    }
}
