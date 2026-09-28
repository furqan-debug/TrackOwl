import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'
import tauriConfig from './src-tauri/tauri.conf.json'

const appVersion = tauriConfig.version || packageJson.version;

// Tauri dev uses a separate Vite config (no vite-plugin-electron)
// This runs on port 5174 to avoid conflicts with the Electron dev server on 5173
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  clearScreen: false,
  // Tauri needs specific env vars
  envPrefix: ['VITE_'],
  build: {
    // Tauri supports es2021
    target: ['es2021', 'chrome105', 'safari13'],
    // do not minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: 'dist',
  },
})
