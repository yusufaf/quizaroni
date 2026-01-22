import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup

export default defineConfig(({ mode }) => {
    const isDevelopment = mode === 'development';
    const apiProxyURL =
        'https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api';

    return {
        define: {
            global: {},
        },
        plugins: [
            react(),
            // VitePWA({ registerType: "autoUpdate" }),
        ],
        resolve: {
            alias: {
                src: path.resolve('src/'),
                views: path.resolve('src/views/'),
                state: path.resolve('src/state/'),
                shared: path.resolve('src/shared/'),
                resources: path.resolve('src/resources/'),
                i18n: path.resolve('src/i18n/'),
                // Shared subfolders
                // api: path.resolve("src/shared/api/"),
                components: path.resolve('src/shared/components/'),
                constants: path.resolve('src/shared/constants/'),
                hooks: path.resolve('src/shared/hooks/'),
                styles: path.resolve('src/shared/styles/'),
                theme: path.resolve('src/shared/theme/'),
                utilities: path.resolve('src/shared/utilities/'),
            },
        },
        server: {
            proxy: {
                '/api': {
                    target: apiProxyURL,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
            port: 3000,
        },
    };
});
