import { ACTIVE_LOCALE_CODES, DEFAULT_LOCALE } from './locales'

const STORAGE_KEY = 'mbc-locale'

/**
 * Explicit user choice, made via the language switcher or a previous
 * automatic-detection redirect. Present → sticky (always wins over browser
 * detection on future visits). Absent → "Automatic": re-run browser
 * detection every visit. This is what "Reset to Automatic" clears.
 */
export function getSavedLocale(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && ACTIVE_LOCALE_CODES.includes(value) ? value : null
  } catch {
    return null
  }
}

export function saveLocale(locale: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Private browsing / blocked storage — the site still works, it just
    // re-detects from the browser language on every visit instead.
  }
}

export function clearSavedLocale(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage was never writable.
  }
}

/**
 * First `navigator.languages` entry (already ordered by the user's own
 * preference) that matches one of our active locales. Only ever reads the
 * browser's own reported language — never an IP-based country guess, which
 * is not implemented (see docs/i18n-architecture.md: Cloudflare Workers
 * Static Assets has no Worker in front of this site to read `request.cf`,
 * and adding one solely for a best-effort country guess was judged
 * disproportionate, as the task explicitly allows).
 */
export function detectBrowserLocale(): string | null {
  const candidates = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || []
  for (const raw of candidates) {
    if (!raw) continue
    const tag = raw.toLowerCase()
    if (tag.startsWith('zh')) {
      // Only Simplified Chinese is translated; Traditional (zh-TW/zh-HK/zh-Hant)
      // must not be silently shown Simplified content.
      if (tag === 'zh-cn' || tag === 'zh-sg' || tag === 'zh-hans') return 'zh-CN'
      continue
    }
    const primary = tag.split('-')[0]
    const match = ACTIVE_LOCALE_CODES.find((code) => code.toLowerCase() === tag || code.toLowerCase() === primary)
    if (match) return match
  }
  return null
}

/** The locale a first-time visitor with no saved preference should land on. */
export function autoDetectLocale(): string {
  return detectBrowserLocale() ?? DEFAULT_LOCALE
}
