import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup

const apiProxyURL =
    'https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api';

export default defineConfig({
    staged: {
        '*': 'vp check --fix',
    },
    lint: { options: { typeAware: true, typeCheck: true } },
    fmt: {
        trailingComma: 'es5',
        tabWidth: 4,
        semi: true,
        singleQuote: true,
        printWidth: 80,
        sortPackageJson: false,
        ignorePatterns: [],
    },
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
});
