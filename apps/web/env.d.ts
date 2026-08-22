/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
    readonly VITE_AWS_API_KEY: string;
    readonly VITE_LOGTO_ENDPOINT: string;
    readonly VITE_LOGTO_APP_ID: string;
    readonly VITE_LOGTO_API_RESOURCE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
