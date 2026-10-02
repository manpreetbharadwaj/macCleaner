import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App'
import { SITE } from './config/site'
import { PAGES, headTagsFor, metaFor, structuredDataFor } from './data/seo'

export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderHead(url: string): string {
  const meta = metaFor(url)
  const lines = [`<title>${escapeText(meta.title)}</title>`]
  for (const { tag, attrs } of headTagsFor(meta)) {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(' ')
    lines.push(`<${tag} ${a} data-head>`)
  }
  for (const data of structuredDataFor(meta)) {
    lines.push(`<script type="application/ld+json" data-head>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  }
  return lines.join('\n    ')
}

export const siteUrl = SITE.url
export const sitemapPages = Object.values(PAGES).filter((p) => p.indexable)
export const routes = Object.keys(PAGES)
