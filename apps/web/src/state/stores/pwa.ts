import { create } from 'zustand';

const INSTALL_DISMISSED_KEY = 'quizaroni-install-dismissed';

interface PwaState {
    needRefresh: boolean;
    setNeedRefresh: (value: boolean) => void;

    installPromptEvent: BeforeInstallPromptEvent | null;
    setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;

    installDismissed: boolean;
    dismissInstall: () => void;
}

export const usePwaStore = create<PwaState>((set) => ({
    needRefresh: false,
    setNeedRefresh: (value) => set({ needRefresh: value }),

    installPromptEvent: null,
    setInstallPromptEvent: (event) => set({ installPromptEvent: event }),

    installDismissed:
        typeof window !== 'undefined' &&
        window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true',
    dismissInstall: () => {
        window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
        set({ installDismissed: true, installPromptEvent: null });
    },
}));
