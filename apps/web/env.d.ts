/// <reference types="vite-plus/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
    readonly VITE_FEATURE_PUBLISH?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
}
