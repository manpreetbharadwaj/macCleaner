// Renders every route to static HTML after `vite build`, so each page ships
// with its real content and its own <title>, description, canonical URL,
// Open Graph/Twitter tags and JSON-LD — no JavaScript needed for crawlers or
// link previews. Also writes sitemap.xml, robots.txt and 404.html.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const template = readFileSync(path.join(dist, 'index.html'), 'utf-8')
const { render, renderHead, routes, siteUrl, sitemapPages } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)

function page(url) {
  return template
    .replace('<!--app-head-->', renderHead(url))
    .replace('<div id="root"><!--app-html--></div>', `<div id="root" data-route="${url}">${render(url)}</div>`)
}

// Flat files (features.html, privacy.html, …): every common static host
// serves /features from features.html (Firebase/Vercel `cleanUrls`, Netlify,
// Cloudflare Pages, GitHub Pages), and the desktop app's Settings screen
// links to /privacy.html and /terms.html directly.
for (const route of routes) {
  const file = route === '/' ? path.join(dist, 'index.html') : path.join(dist, `${route.slice(1)}.html`)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, page(route))
  console.log(`  prerendered ${route}`)
}

writeFileSync(path.join(dist, '404.html'), page('/404'))
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
console.log('  wrote sitemap.xml and robots.txt')

rmSync(ssrDir, { recursive: true, force: true })
