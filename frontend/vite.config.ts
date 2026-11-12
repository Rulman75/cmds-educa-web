import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

const buildDate = new Date().toISOString().split('T')[0]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
    __GIT_COMMIT__: JSON.stringify('pg18-educa'),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true
  },
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true
      }
    }
  }
})
