import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://meshtasticback.taubetele.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
