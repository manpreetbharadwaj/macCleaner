import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// tauri.conf.json's `version` is the single source of truth for the app's
// version; bake it into the bundle so the browser preview can show it too.
const tauriConf = JSON.parse(readFileSync(path.resolve(import.meta.dirname, './src-tauri/tauri.conf.json'), 'utf-8'))

// Exposes just the `meta` block of every src/i18n/locales/*.json as
// `virtual:locale-meta`, so the language list is discovered from the folder
// without pulling every translation into the main bundle.
function localeMeta(): Plugin {
  const id = 'virtual:locale-meta'
  const dir = path.resolve(import.meta.dirname, './src/i18n/locales')
  return {
    name: 'locale-meta',
    resolveId: (source) => (source === id ? '\0' + id : undefined),
    load(resolved) {
      if (resolved !== '\0' + id) return
      const metas = readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          this.addWatchFile(path.join(dir, f))
          return { ...JSON.parse(readFileSync(path.join(dir, f), 'utf-8')).meta, code: f.slice(0, -5) }
        })
      return `export default ${JSON.stringify(metas)}`
    },
  }
}

// Tauri expects a fixed, predictable dev server port (see src-tauri/tauri.conf.json's devUrl).
export default defineConfig({
  plugins: [react(), tailwindcss(), localeMeta()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(tauriConf.version as string),
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/website/**'],
    },
  },
})
