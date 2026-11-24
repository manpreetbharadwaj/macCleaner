import i18next, { type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, NAMESPACES } from './locales'

// Lazy glob: Vite code-splits each namespace file into its own chunk, so a
// page load only ever fetches the one locale actually needed (plus English,
// kept in memory as a fallback for any key a partial translation misses).
const modules = import.meta.glob('../locales/*/*.json') as Record<string, () => Promise<{ default: Record<string, unknown> }>>

export async function loadLocaleResources(locale: string): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {}
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const loader = modules[`../locales/${locale}/${ns}.json`]
      if (!loader) return
      out[ns] = (await loader()).default
    }),
  )
  return out
}

/**
 * A fresh i18next instance per call. Required for SSR — scripts/prerender.mjs
 * renders every locale × route combination in one Node process, so mutable
 * global i18next state (the default singleton) would leak translations
 * between pages. The client creates exactly one instance per page load and
 * reuses it for the rest of the session (see LocaleContext.tsx).
 */
export async function createI18n(locale: string): Promise<I18nInstance> {
  const instance = i18next.createInstance()
  const needsFallback = locale !== DEFAULT_LOCALE
  const [resources, fallbackResources] = await Promise.all([loadLocaleResources(locale), needsFallback ? loadLocaleResources(DEFAULT_LOCALE) : Promise.resolve(undefined)])

  await instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES,
    defaultNS: 'common',
    resources: fallbackResources ? { [locale]: resources, [DEFAULT_LOCALE]: fallbackResources } : { [locale]: resources },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    // All namespaces for the active locale are already resolved above —
    // nothing is loaded asynchronously after init, so Suspense is never needed.
    react: { useSuspense: false },
  })
  return instance
}

/** Used by the language switcher to add a not-yet-loaded locale into a live instance without a page reload. */
export async function addLocaleToInstance(instance: I18nInstance, locale: string): Promise<void> {
  if (instance.hasResourceBundle(locale, 'common')) return
  const resources = await loadLocaleResources(locale)
  for (const ns of Object.keys(resources)) {
    instance.addResourceBundle(locale, ns, resources[ns], true, true)
  }
}
