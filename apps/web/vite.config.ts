import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup

const apiProxyURL =
    'https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api';

export default defineConfig({
    staged: {
        '*.{js,jsx,ts,tsx}': ['vp lint --fix', 'vp fmt --write'],
        '*.{json,md,css,html,yml,yaml}': 'vp fmt --write',
    },
    lint: { options: { typeAware: true, typeCheck: true } },
    test: { globals: true },
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
        dedupe: ['react', 'react-dom'],
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
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/client'],
        // Rolldown's dep optimizer auto-splits @emotion/react / @mui/styled-engine
        // into a shared chunk but drops the cross-chunk init-guard import, causing
        // `init_emotion_react_browser_development_esm is not defined`. Force emotion
        // + mui into one chunk via rolldown's native advancedChunks so the init
        // guards stay in-scope.
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: 'mui-emotion',
                            test: /[\\/]node_modules[\\/](\.pnpm[\\/])?(@emotion|@mui|hoist-non-react-statics)/,
                        },
                    ],
                },
            },
        },
    },
    server: {
        host: '127.0.0.1',
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
