import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useLocale } from '@/i18n/LocaleContext'
import { DEFAULT_LOCALE, isLocaleCode } from '@/i18n/locales'
import { detectBrowserLocale, getSavedLocale, saveLocale } from '@/i18n/detect'
import { NotFoundPage } from '@/pages/NotFound'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { ScrollManager } from './ScrollManager'

/**
 * Renders the page chrome (skip link, nav, footer) for both route trees in
 * routes.tsx: the default, unprefixed one (`prefixed={false}`, path `/...`)
 * and the locale-prefixed one (`prefixed={true}`, path `/:locale/...`).
 *
 * Also owns the only two places this site ever redirects based on language,
 * both client-side only (SSR/prerendering never runs these effects, so
 * crawlers always see the real, unprefixed English page at a given path —
 * see docs/i18n-architecture.md):
 *   1. A visitor with an already-saved language preference lands on any
 *      unprefixed page → sent to that language's version of the same page.
 *   2. A first-time visitor with no saved preference lands on `/` itself
 *      (not a deep link) → sent to their browser's language, if supported.
 */
export function LocaleLayout({ prefixed }: { prefixed: boolean }) {
  const params = useParams<{ locale?: string }>()
  const { pathname } = useLocation()
  const { switchLocale, applyDetectedLocale } = useLocale()
  const { t } = useTranslation('common')
  useDocumentMeta(pathname)

  const urlLocale = prefixed ? params.locale : DEFAULT_LOCALE
  const validLocale = prefixed ? isLocaleCode(urlLocale) && urlLocale !== DEFAULT_LOCALE : true

  useEffect(() => {
    if (!validLocale) return
    if (prefixed) {
      // An explicit localized URL was visited directly — remember it for
      // future visits to the bare (unprefixed) domain.
      if (getSavedLocale() !== urlLocale) saveLocale(urlLocale as string)
      return
    }
    const saved = getSavedLocale()
    if (saved && saved !== DEFAULT_LOCALE) {
      switchLocale(saved)
      return
    }
    if (!saved && pathname === '/') {
      const detected = detectBrowserLocale()
      if (detected && detected !== DEFAULT_LOCALE) applyDetectedLocale(detected)
    }
    // Only re-run when the route tree / path changes — not on every locale change this effect itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefixed, pathname, validLocale])

  return (
    <>
      <a href="#main" className="skip-link">
        {t('skipToContent')}
      </a>
      <div className="bg-glow" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <ScrollManager />
      <Navbar />
      <main id="main" tabIndex={-1}>
        {validLocale ? <Outlet /> : <NotFoundPage />}
      </main>
      <Footer />
    </>
  )
}
