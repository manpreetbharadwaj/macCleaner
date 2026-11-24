import { DEFAULT_LOCALE, PREFIXED_LOCALE_CODES, isLocaleCode } from './locales'

/**
 * Splits a pathname like `/de/features` into its locale (if any, else the
 * default) and the unprefixed path (`/features`) that exists identically
 * under every locale. Also accepts `.html`-suffixed paths, matching
 * data/seo.ts's own normalization, since some hosts/links hit those.
 */
export function splitLocaleFromPath(pathname: string): { locale: string; path: string } {
  const stripped = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '')
  const normalized = stripped.length > 1 ? stripped.replace(/\/+$/, '') : stripped
  const [, first, rest] = normalized.match(/^\/([^/]*)(\/.*)?$/) ?? []
  if (isLocaleCode(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: rest && rest !== '' ? rest : '/' }
  }
  return { locale: DEFAULT_LOCALE, path: normalized || '/' }
}

/** The canonical, unprefixed form of a path — e.g. `/de/features` and `/features` both give `/features`. */
export function unprefixedPath(pathname: string): string {
  return splitLocaleFromPath(pathname).path
}

/** Builds the URL for `unprefixedPath` in `locale` — English has no prefix. Root (`/`) becomes `/de`, never `/de/`. */
export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  const clean = path === '/' ? '' : path
  return `/${locale}${clean}`
}

/** Every locale's URL for a given canonical path — used for hreflang alternates. */
export function alternatePaths(path: string): { locale: string; href: string }[] {
  return [DEFAULT_LOCALE, ...PREFIXED_LOCALE_CODES].map((locale) => ({ locale, href: localizedPath(locale, path) }))
}
