import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// Fix: Import fileURLToPath to resolve __dirname in ES modules
import { fileURLToPath } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Fix: __dirname is not available in ES modules. This correctly resolves the path to the src directory.
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
