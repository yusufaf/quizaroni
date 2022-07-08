import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mix from 'vite-plugin-mix'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
// TODO: https://vite-plugin-pwa.netlify.app/guide/#setup
export default defineConfig({
  plugins: [
    react(), 
    VitePWA({ registerType: 'autoUpdate' })
  ],
  // proxy: {
  //   "/api": {
  //     target: 'https://localhost:5000/',
  //     changeOrigin: true,
  //     secure: false,
  //     ws: true,
  //   }
  // }
})
