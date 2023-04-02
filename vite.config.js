import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mix from 'vite-plugin-mix'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup
export default defineConfig({
  define: {
    global: {}
  },
  plugins: [
    react(), 
    VitePWA({ registerType: 'autoUpdate' })
  ],
  resolve: {
    alias: {
      src: path.resolve('src/'),
    },
  }
  // proxy: {
  //   "/api": {
  //     target: 'https://localhost:5000/',
  //     changeOrigin: true,
  //     secure: false,
  //     ws: true,
  //   }
  // }
})
