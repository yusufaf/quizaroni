import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup

export default defineConfig(({ command, mode }) => {
    const isDevelopment = mode === 'development';
    const apiProxyURL = isDevelopment ? "http://localhost:5000/" : "https://quizaroni-api.onrender.com/"; 

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
                src: path.resolve("src/"),
                components: path.resolve("src/components/"),
                views: path.resolve("src/views/"),
                state: path.resolve("src/state/"),
                lib: path.resolve("src/lib/"),
                resources: path.resolve("src/resources/"),
                utilities: path.resolve("src/utilities/"),
                theme: path.resolve("src/lib/theme/"),
                common: path.resolve("src/common/"),
            },
        },
        server: {
            proxy: {
                "/api": {
                    target: apiProxyURL,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                },
            },
            port: 3000,
        },
    }
});