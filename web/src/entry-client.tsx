import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './App'
import { metaFor } from './data/seo'
import './styles/index.css'

// Some hosts serve /privacy.html without redirecting to /privacy (the desktop
// app links to the .html form). Normalize before the router reads the URL.
const { pathname, search, hash } = window.location
const clean = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/(.)\/+$/, '$1')
if (clean !== pathname) window.history.replaceState(null, '', clean + search + hash)

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.mjs) and stamped with
// their route. Hydrate only when that markup belongs to this URL — a host's
// SPA fallback (or the dev server's empty shell) gets a fresh client render.
if (container.firstElementChild && container.dataset.route === metaFor(clean).path) {
  hydrateRoot(container, app)
} else {
  container.textContent = ''
  createRoot(container).render(app)
}
