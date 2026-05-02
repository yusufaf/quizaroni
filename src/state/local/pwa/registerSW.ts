export function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener('statechange', () => {
                            if (
                                newWorker.state === 'installed' &&
                                navigator.serviceWorker.controller
                            ) {
                                // New update available
                                console.log('New version available');
                                // Could dispatch an event here to show update prompt
                                window.dispatchEvent(
                                    new CustomEvent('sw-update-available')
                                );
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('SW registration failed:', error);
                });
        });
    }
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

// Force update to new version
export async function skipWaiting(): Promise<void> {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
            registration.waiting.postMessage('skipWaiting');
        }
    }
}
