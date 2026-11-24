// Renders every route, in every active language, to static HTML after
// `vite build` — so each page ships with its real, already-translated
// content and its own <title>, description, canonical URL, hreflang
// alternates, Open Graph/Twitter tags and JSON-LD — no JavaScript needed for
// crawlers or link previews. Also writes sitemap.xml, robots.txt and 404.html.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const template = readFileSync(path.join(dist, 'index.html'), 'utf-8')
const { renderPage, routes, siteUrl, sitemapPages, activeLocales, localizedPath } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)

async function page(url) {
  const { html, head, locale, dir } = await renderPage(url)
  const htmlTag = dir === 'rtl' ? `<html lang="${locale}" dir="rtl">` : `<html lang="${locale}">`
  return template.replace('<html lang="en">', htmlTag).replace('<!--app-head-->', head).replace('<div id="root"><!--app-html--></div>', `<div id="root" data-route="${url}">${html}</div>`)
}

function fileForUrl(url) {
  return url === '/' ? path.join(dist, 'index.html') : path.join(dist, `${url.slice(1)}.html`)
}

// Flat files (features.html, privacy.html, de/features.html, …): every
// common static host serves /features from features.html and /de/features
// from de/features.html (Firebase/Vercel `cleanUrls`, Netlify, Cloudflare
// Pages, GitHub Pages / Cloudflare Workers Static Assets), and the desktop
// app's Settings screen links to /privacy.html and /terms.html directly.
let count = 0
for (const route of routes) {
  for (const locale of activeLocales) {
    const url = localizedPath(locale, route)
    const file = fileForUrl(url)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, await page(url))
    count += 1
  }
}
console.log(`  prerendered ${count} pages across ${activeLocales.length} languages`)

writeFileSync(path.join(dist, '404.html'), await page('/404'))
console.log('  prerendered 404.html')

const today = new Date().toISOString().slice(0, 10)
const urls = sitemapPages
  .map(
    (p) => `  <url>
    <loc>${siteUrl}${p.path === '/' ? '/' : p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq ?? 'monthly'}</changefreq>
    <priority>${(p.priority ?? 0.5).toFixed(1)}</priority>
  </url>`,
  )
  .join('\n')
writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
)
writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)
console.log(`  wrote sitemap.xml (${sitemapPages.length} URLs) and robots.txt`)

rmSync(ssrDir, { recursive: true, force: true })
