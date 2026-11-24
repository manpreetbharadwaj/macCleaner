/**
 * The 16 supported languages. `en` is the default: it is never prefixed in
 * URLs (canonical paths like `/features` stay exactly as they were before
 * i18n existed, for backwards compatibility with existing links/bookmarks/
 * search results). Every other language is served under `/<code>/...`.
 *
 * `ready` marks a locale whose translations have been written and reviewed
 * well enough to publish — see docs/i18n-translation-status.md for exactly
 * what "reviewed" means for each one. A locale that isn't ready yet still
 * exists here (so the architecture never needs to change to add it) but is
 * excluded from the language switcher, hreflang tags and the sitemap by
 * `ACTIVE_LOCALES` below, so nothing incomplete is ever shown to a user or
 * a search engine.
 */
export interface LocaleInfo {
  code: string
  /** English name, used in code comments / admin contexts only. */
  englishName: string
  /** Name written in the language itself — shown in the switcher. */
  nativeName: string
  dir: 'ltr' | 'rtl'
  ready: boolean
}

export const DEFAULT_LOCALE = 'en'

export const LOCALES: LocaleInfo[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', dir: 'ltr', ready: true },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', dir: 'ltr', ready: true },
  { code: 'fr', englishName: 'French', nativeName: 'Français', dir: 'ltr', ready: true },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', dir: 'ltr', ready: true },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', dir: 'ltr', ready: true },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', dir: 'ltr', ready: true },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', ready: true },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski', dir: 'ltr', ready: true },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', ready: true },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', dir: 'ltr', ready: true },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', dir: 'ltr', ready: true },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', dir: 'ltr', ready: true },
  { code: 'zh-CN', englishName: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', ready: true },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', ready: true },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', dir: 'rtl', ready: true },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', ready: true },
]

export const LOCALE_CODES = LOCALES.map((l) => l.code)
export const ACTIVE_LOCALES = LOCALES.filter((l) => l.ready)
export const ACTIVE_LOCALE_CODES = ACTIVE_LOCALES.map((l) => l.code)
/** Non-default locales that get a `/<code>/...` URL prefix. */
export const PREFIXED_LOCALE_CODES = ACTIVE_LOCALE_CODES.filter((c) => c !== DEFAULT_LOCALE)

export function isLocaleCode(value: string | undefined): value is string {
  return !!value && ACTIVE_LOCALE_CODES.includes(value)
}

export function localeInfo(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]
}

/** BCP-47 tag for <html lang>, hreflang, and Intl APIs (zh-CN is already valid as-is). */
export function bcp47(code: string): string {
  return code
}

/** Namespaces every page pulls from `common` plus its own page namespace. */
export const NAMESPACES = ['common', 'seo', 'home', 'features', 'pricing', 'download', 'faq', 'support', 'changelog', 'thankYou', 'notFound', 'privacy', 'terms'] as const
export type Namespace = (typeof NAMESPACES)[number]
