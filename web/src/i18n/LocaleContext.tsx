import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { i18n as I18nInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { useNavigate } from 'react-router'
import { addLocaleToInstance } from './createI18n'
import { autoDetectLocale, clearSavedLocale, saveLocale } from './detect'
import { localeInfo } from './locales'
import { localizedPath, unprefixedPath } from './paths'

interface LocaleContextValue {
  locale: string
  /** User-initiated change (the language switcher): persists as the saved preference. */
  switchLocale: (next: string) => Promise<void>
  /** System-initiated change (the homepage's one-time browser-language redirect): never persists, so detection runs fresh again next visit. */
  applyDetectedLocale: (next: string) => Promise<void>
  /** Clears the saved preference and re-detects from the browser right away. */
  resetToAutomatic: () => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

/**
 * Wraps the whole app once, below the Router. `locale`/`i18n` are the values
 * entry-server.tsx / entry-client.tsx resolved from the current URL before
 * the first render, so first paint (and hydration) always match the
 * prerendered HTML exactly — any change after that (switcher, detection
 * redirect) goes through this provider's own methods instead.
 */
export function LocaleProvider({ locale: initialLocale, i18n, children }: { locale: string; i18n: I18nInstance; children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale)
  const navigate = useNavigate()

  useEffect(() => {
    const onChanged = (lng: string) => setLocale(lng)
    i18n.on('languageChanged', onChanged)
    return () => {
      i18n.off('languageChanged', onChanged)
    }
  }, [i18n])

  useEffect(() => {
    const info = localeInfo(locale)
    document.documentElement.lang = info.code
    document.documentElement.dir = info.dir
  }, [locale])

  async function applyLocale(next: string) {
    if (next === locale) return
    await addLocaleToInstance(i18n, next)
    await i18n.changeLanguage(next)
    navigate(localizedPath(next, unprefixedPath(window.location.pathname)))
  }

  async function switchLocale(next: string) {
    await applyLocale(next)
    saveLocale(next)
  }

  async function applyDetectedLocale(next: string) {
    await applyLocale(next)
  }

  async function resetToAutomatic() {
    clearSavedLocale()
    await applyLocale(autoDetectLocale())
  }

  const value = useMemo<LocaleContextValue>(() => ({ locale, switchLocale, applyDetectedLocale, resetToAutomatic }), [locale, i18n])

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  )
}
