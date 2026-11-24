import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App'
import { SITE } from './config/site'
import { headTagsFor, metaFor, PAGE_CONFIG, sitemapEntries, structuredDataFor } from './data/seo'
import { createI18n } from './i18n/createI18n'
import { LocaleProvider } from './i18n/LocaleContext'
import { ACTIVE_LOCALES, DEFAULT_LOCALE, isLocaleCode, localeInfo } from './i18n/locales'
import { localizedPath, splitLocaleFromPath } from './i18n/paths'

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function resolveLocale(url: string): string {
  const { locale } = splitLocaleFromPath(url)
  return isLocaleCode(locale) ? locale : DEFAULT_LOCALE
}

/**
 * Renders one URL's HTML and <head> tags in a single pass (one i18n
 * instance, not two) — scripts/prerender.mjs calls this once per locale ×
 * route combination.
 */
export async function renderPage(url: string): Promise<{ html: string; head: string; locale: string; dir: 'ltr' | 'rtl' }> {
  const locale = resolveLocale(url)
  const i18n = await createI18n(locale)

  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <LocaleProvider locale={locale} i18n={i18n}>
          <AppRoutes />
        </LocaleProvider>
      </StaticRouter>
    </StrictMode>,
  )

  const meta = metaFor(i18n, url)
  const lines = [`<title>${escapeText(meta.title)}</title>`]
  for (const { tag, attrs } of headTagsFor(i18n, meta)) {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(' ')
    lines.push(`<${tag} ${a} data-head>`)
  }
  for (const data of structuredDataFor(i18n, meta)) {
    lines.push(`<script type="application/ld+json" data-head>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  }

  return { html, head: lines.join('\n    '), locale, dir: localeInfo(locale).dir }
}

export const siteUrl = SITE.url
/** Canonical (unprefixed/English) route paths — scripts/prerender.mjs expands these across every active locale. */
export const routes = Object.keys(PAGE_CONFIG)
export const sitemapPages = sitemapEntries()
export const activeLocales = ACTIVE_LOCALES.map((l) => l.code)
export { localizedPath }
