import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mix from 'vite-plugin-mix'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mix({
      handler: './api.js',
    }
    ),],
  proxy: {
    "/api": {
      target: 'https://localhost:5000/',
      changeOrigin: true,
      secure: false,
      ws: true,
    }
  }
})
