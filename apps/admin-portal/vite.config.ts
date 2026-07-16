import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
<<<<<<< HEAD
=======
  },
  server: {
    proxy: {
      '/help': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      }
    }
>>>>>>> 1a3f757750b6081d2d9ea002247c0a3995feabc4
  }
})