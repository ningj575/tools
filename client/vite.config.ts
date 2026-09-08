import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](pdfjs-dist|pdf-lib)/.test(id)) return 'pdf'
          if (/node_modules[\\/](vue|vue-router|element-plus)/.test(id)) return 'ui'
          return undefined
        },
      },
    },
  },
})
