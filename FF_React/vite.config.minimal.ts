import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Minimal config for debugging
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
})