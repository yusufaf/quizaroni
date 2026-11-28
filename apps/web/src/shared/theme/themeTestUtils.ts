import { vi } from 'vite-plus/test';

type Listener = (event: { matches: boolean; media: string }) => void;

// MUI 5.18's useMediaQuery subscribes with addListener/removeListener, so the
// stub supports both listener APIs.
export const stubMatchMedia = (
    initialDark = false
): { setDark(next: boolean): void } => {
    let dark = initialDark;
    const listeners = new Set<Listener>();
    vi.stubGlobal('matchMedia', (media: string) => {
        const isDarkQuery = media.includes('prefers-color-scheme: dark');
        return {
            get matches() {
                return isDarkQuery ? dark : false;
            },
            media,
            onchange: null,
            addListener: (l: Listener) => {
                if (isDarkQuery) listeners.add(l);
            },
            removeListener: (l: Listener) => listeners.delete(l),
            addEventListener: (_type: string, l: Listener) => {
                if (isDarkQuery) listeners.add(l);
            },
            removeEventListener: (_type: string, l: Listener) =>
                listeners.delete(l),
            dispatchEvent: () => true,
        };
    });
    return {
        setDark(next: boolean) {
            dark = next;
            for (const l of listeners) {
                l({ matches: next, media: '(prefers-color-scheme: dark)' });
            }
        },
    };
};

// jsdom reads hex background colours back as rgb(), so compare through it.
export const normColor = (value: string): string => {
    const el = document.createElement('div');
    el.style.backgroundColor = value;
    return el.style.backgroundColor;
};
