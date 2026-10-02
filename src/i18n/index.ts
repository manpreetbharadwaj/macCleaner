import i18n, { type ParseKeys } from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import localeMetas from 'virtual:locale-meta'
import { FALLBACK_LANGUAGE, resolveLanguage, type LanguagePreference } from './resolve'

/**
 * Localization runtime.
 *
 * Every language is one self-describing file in ./locales (its `meta` block
 * carries the native name, English name and text direction). The list of
 * languages is discovered from that folder at build time, so adding a
 * language means adding a JSON file — no code changes.
 *
 * English ships in the main bundle; every other language is loaded on
 * demand the first time it's needed.
 */

/** Any valid translation key — use for labels stored in data/config objects. */
export type TKey = ParseKeys

export interface LanguageInfo {
  code: string
  englishName: string
  nativeName: string
  dir: 'ltr' | 'rtl'
  /** Position in the language picker (meta.order in the locale file); unordered languages sort by English name after these. */
  order?: number
}

const loaders = import.meta.glob<{ default: Record<string, unknown> }>(['./locales/*.json', '!./locales/en.json'])

export const LANGUAGES: LanguageInfo[] = [...localeMetas].sort(
  (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.englishName.localeCompare(b.englishName),
)

export const SUPPORTED_CODES = LANGUAGES.map((l) => l.code)

export function languageInfo(code: string): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

void i18n.use(initReactI18next).init({
  resources: { [FALLBACK_LANGUAGE]: { translation: en } },
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_CODES,
  interpolation: {
    // React already escapes HTML. The "escape" hook is used only for bidi:
    // in right-to-left languages every inserted value (file names, paths,
    // sizes, app names) is wrapped in Unicode isolates (FSI…PDI) so a Latin
    // value can never reorder the Arabic sentence around it.
    escapeValue: true,
    escape: (value: unknown) => (languageInfo(i18n.language).dir === 'rtl' ? `\u2068${String(value)}\u2069` : String(value)),
  },
  returnNull: false,
  react: { useSuspense: false },
  // In development, a key missing from the active language is a console error,
  // which the UI smoke tests treat as a failure.
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (lngs, _ns, key) => console.error(`[i18n] missing "${key}" for ${lngs.join(', ')}`),
})

async function ensureLoaded(code: string): Promise<void> {
  if (i18n.hasResourceBundle(code, 'translation')) return
  const loader = loaders[`./locales/${code}.json`]
  if (!loader) return
  const mod = await loader()
  i18n.addResourceBundle(code, 'translation', mod.default, true, true)
}

/** The BCP-47 tag used for Intl formatting. Arabic keeps Latin digits so sizes and charts stay consistent. */
export function formattingLocale(code: string = i18n.language): string {
  return code === 'ar' ? 'ar-u-nu-latn' : code
}

type Listener = (code: string) => void
const listeners = new Set<Listener>()
export function onLanguageApplied(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Resolves the preference against the Mac's languages, loads the bundle and
 * switches the whole UI instantly (no restart). Also sets <html lang/dir>
 * for right-to-left languages.
 */
export async function applyLanguage(preference: LanguagePreference | undefined, systemLocales: readonly string[]): Promise<string> {
  const code = resolveLanguage(preference, systemLocales, SUPPORTED_CODES)
  await ensureLoaded(code)
  if (i18n.language !== code) await i18n.changeLanguage(code)
  const info = languageInfo(code)
  document.documentElement.lang = code
  document.documentElement.dir = info.dir
  listeners.forEach((fn) => fn(code))
  return code
}

/**
 * For keys that come from data rather than code (keys stored on scan items,
 * native progress phases, mapped native errors). These can't be checked by
 * the compiler; scripts/i18n-check.mjs verifies every such key exists.
 */
export function tDynamic(key: string, options?: Record<string, unknown>): string {
  return (i18n.t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, options)
}

export { i18n }
