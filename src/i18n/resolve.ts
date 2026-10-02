/**
 * Pure language-resolution logic (no React, no Tauri) so it can be unit
 * tested on its own — see resolve.test.ts.
 */

export const FALLBACK_LANGUAGE = 'en'

/** 'system' follows macOS; anything else is a supported language code. */
export type LanguagePreference = 'system' | string

/**
 * Maps an OS/browser locale tag onto one of `supported`, or null.
 *
 *   en-US, en-GB, en_IN   → en
 *   de-DE, de-AT          → de
 *   pt-BR, pt-PT          → pt
 *   zh-Hans, zh-Hans-CN, zh-CN, zh-SG, zh → zh-CN
 *   zh-Hant, zh-Hant-TW, zh-TW, zh-HK, zh-MO → zh-TW
 *   sv-SE (unsupported)   → null
 */
export function normalizeLocale(tag: string, supported: readonly string[]): string | null {
  const cleaned = tag.trim().replace(/_/g, '-')
  if (!cleaned) return null
  const parts = cleaned.split('-')
  const lang = parts[0].toLowerCase()
  const byLower = new Map(supported.map((s) => [s.toLowerCase(), s]))

  if (lang === 'zh') {
    const rest = parts.slice(1).map((p) => p.toLowerCase())
    const traditional = rest.includes('hant') || rest.some((p) => p === 'tw' || p === 'hk' || p === 'mo')
    const target = traditional ? 'zh-tw' : 'zh-cn'
    return byLower.get(target) ?? byLower.get('zh') ?? null
  }

  // Exact match first (e.g. a future "pt-BR" file), then language + region, then the base language.
  const exact = byLower.get(cleaned.toLowerCase())
  if (exact) return exact
  const region = parts.find((p, i) => i > 0 && /^[A-Za-z]{2}$|^\d{3}$/.test(p))
  if (region) {
    const withRegion = byLower.get(`${lang}-${region.toLowerCase()}`)
    if (withRegion) return withRegion
  }
  return byLower.get(lang) ?? null
}

/**
 * The language the app should display.
 * - A manual choice always wins (if it's still supported).
 * - 'system' walks the Mac's ordered preferred languages and picks the first
 *   one we support — the same way macOS chooses a localization for any app.
 * - Nothing supported → English.
 */
export function resolveLanguage(preference: LanguagePreference | undefined | null, systemLocales: readonly string[], supported: readonly string[]): string {
  if (preference && preference !== 'system') {
    const manual = normalizeLocale(preference, supported)
    if (manual) return manual
  }
  for (const tag of systemLocales) {
    const match = normalizeLocale(tag, supported)
    if (match) return match
  }
  return supported.includes(FALLBACK_LANGUAGE) ? FALLBACK_LANGUAGE : supported[0]
}
