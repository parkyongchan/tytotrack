import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'satellite.js': path.resolve('./node_modules/satellite.js/dist/satellite.es.js'),
    },
  },
  optimizeDeps: {
    include: ['satellite.js'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})