import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://meshtasticback.taubetele.com',
        changeOrigin: true,
        secure: true,
      },
      '/deviceMetrics': {
        target: 'https://meshtasticback.taubetele.com',
        changeOrigin: true,
        secure: true,
      },
      '/environmentMetrics': {
        target: 'https://meshtasticback.taubetele.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
