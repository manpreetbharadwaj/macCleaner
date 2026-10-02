import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/services/environment'

/**
 * The Mac's preferred languages, most preferred first. In the desktop app
 * this comes from macOS itself (NSLocale.preferredLanguages, which also
 * honours a per-app language set in System Settings); the browser preview
 * falls back to navigator.languages.
 */
export async function getSystemLocales(): Promise<string[]> {
  if (isTauriRuntime()) {
    try {
      const langs = await invoke<string[]>('get_preferred_languages')
      if (langs.length) return langs
    } catch (err) {
      console.warn('[i18n] Could not read macOS languages, using the web view’s:', err)
    }
  }
  return navigator.languages?.length ? [...navigator.languages] : [navigator.language]
}

/** Lets the native side localize the menu bar (and keep it in sync with the UI). */
export async function syncNativeLanguage(code: string): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    await invoke('set_app_language', { code })
  } catch (err) {
    console.warn('[i18n] Could not localize the native menu:', err)
  }
}
