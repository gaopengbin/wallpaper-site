import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { downloadProxyPlugin } from './server/download-proxy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), downloadProxyPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'https://haowallpaper.com/link',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/img': {
        target: 'https://haowallpaper.com/link/common/file',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/img/, ''),
        headers: {
          Referer: 'https://haowallpaper.com/',
        },
      },
      '/nas-cache': {
        target: 'http://192.168.31.232:8066',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nas-cache/, ''),
      },
      '/nas': {
        target: 'https://wp.gpb.cc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nas/, ''),
      },
    },
  },
})
