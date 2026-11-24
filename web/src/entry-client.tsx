import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './App'
import { createI18n } from './i18n/createI18n'
import { LocaleProvider } from './i18n/LocaleContext'
import { DEFAULT_LOCALE, isLocaleCode } from './i18n/locales'
import { splitLocaleFromPath } from './i18n/paths'
import './styles/index.css'

// Some hosts serve /privacy.html without redirecting to /privacy (the desktop
// app links to the .html form). Normalize before the router reads the URL.
const { pathname, search, hash } = window.location
const clean = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/(.)\/+$/, '$1')
if (clean !== pathname) window.history.replaceState(null, '', clean + search + hash)

async function main() {
  const { locale: urlLocale } = splitLocaleFromPath(clean)
  const locale = isLocaleCode(urlLocale) ? urlLocale : DEFAULT_LOCALE
  const i18n = await createI18n(locale)

  const container = document.getElementById('root')!
  const app = (
    <StrictMode>
      <BrowserRouter>
        <LocaleProvider locale={locale} i18n={i18n}>
          <AppRoutes />
        </LocaleProvider>
      </BrowserRouter>
    </StrictMode>
  )

  // Production pages are prerendered (scripts/prerender.mjs) and stamped with
  // their route. Hydrate only when that markup belongs to this URL — a host's
  // SPA fallback (or the dev server's empty shell) gets a fresh client render.
  if (container.firstElementChild && container.dataset.route === clean) {
    hydrateRoot(container, app)
  } else {
    container.textContent = ''
    createRoot(container).render(app)
  }
}

void main()
