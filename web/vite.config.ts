import { readFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The desktop app's tauri.conf.json is the single source of truth for the
// app version and minimum macOS version, so the website can never drift
// from what was actually built.
const tauriConf = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../src-tauri/tauri.conf.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(tauriConf.version as string),
    __APP_MIN_MACOS__: JSON.stringify((tauriConf.bundle?.macOS?.minimumSystemVersion as string) ?? '11.0'),
    __APP_BUNDLE_ID__: JSON.stringify(tauriConf.identifier as string),
  },
  server: { port: 5180 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
})
