import type { i18n as I18nInstance } from 'i18next'
import { APP, PURCHASE, SITE, absoluteUrl, architectureLabel } from '@/config/site'
import { buildFaqGroups } from '@/data/faq'
import { ACTIVE_LOCALES, DEFAULT_LOCALE, bcp47 } from '@/i18n/locales'
import { alternatePaths, localizedPath, splitLocaleFromPath } from '@/i18n/paths'

export interface PageConfig {
  path: string
  indexable: boolean
  changefreq?: 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

/** Canonical (unprefixed/English) path config — identical under every locale. Title/description live in locales/<lang>/seo.json instead. */
export const PAGE_CONFIG: Record<string, PageConfig> = {
  '/': { path: '/', indexable: true, changefreq: 'weekly', priority: 1 },
  '/features': { path: '/features', indexable: true, changefreq: 'monthly', priority: 0.9 },
  '/pricing': { path: '/pricing', indexable: true, changefreq: 'monthly', priority: 0.7 },
  '/download': { path: '/download', indexable: true, changefreq: 'weekly', priority: 0.9 },
  '/faq': { path: '/faq', indexable: true, changefreq: 'monthly', priority: 0.7 },
  '/support': { path: '/support', indexable: true, changefreq: 'yearly', priority: 0.5 },
  '/changelog': { path: '/changelog', indexable: true, changefreq: 'monthly', priority: 0.5 },
  '/privacy': { path: '/privacy', indexable: true, changefreq: 'yearly', priority: 0.4 },
  '/terms': { path: '/terms', indexable: true, changefreq: 'yearly', priority: 0.3 },
  '/thank-you': { path: '/thank-you', indexable: false },
}

export const NOT_FOUND_CONFIG: PageConfig = { path: '/404', indexable: false }

export function pageConfigFor(pathname: string): PageConfig {
  const { path } = splitLocaleFromPath(pathname)
  return PAGE_CONFIG[path] ?? NOT_FOUND_CONFIG
}

export interface PageMeta extends PageConfig {
  locale: string
  title: string
  description: string
}

const SEO_VARS = () => ({ version: APP.version, trialDays: PURCHASE.trialDays, price: PURCHASE.priceDisplay, macos: APP.minMacOSName, architecture: architectureLabel() })

/** Reads this page's title/description from the i18n instance's already-loaded `seo` namespace. */
export function metaFor(i18n: I18nInstance, pathname: string): PageMeta {
  const { locale, path } = splitLocaleFromPath(pathname)
  const config = PAGE_CONFIG[path] ?? NOT_FOUND_CONFIG
  const vars = SEO_VARS()
  return {
    ...config,
    locale,
    title: i18n.t(`${config.path}.title`, { ns: 'seo', ...vars }),
    description: i18n.t(`${config.path}.description`, { ns: 'seo', ...vars }),
  }
}

const OG_IMAGE = '/og-image.jpg'

function softwareApplicationSchema(i18n: I18nInstance, meta: PageMeta): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: `macOS ${APP.minMacOS} or later`,
    softwareVersion: APP.version,
    description: i18n.t('/.description', { ns: 'seo', ...SEO_VARS() }),
    inLanguage: bcp47(meta.locale),
    url: absoluteUrl(localizedPath(meta.locale, '/')),
    downloadUrl: absoluteUrl(localizedPath(meta.locale, '/download')),
    image: absoluteUrl(OG_IMAGE),
    screenshot: [absoluteUrl('/screens/dashboard.jpg'), absoluteUrl('/screens/performance.jpg')],
    featureList: i18n.t('schema.featureList', { ns: 'seo', returnObjects: true }),
  }
}

function faqSchema(i18n: I18nInstance, locale: string): object {
  const t = i18n.getFixedT(locale, 'faq')
  const tPricing = i18n.getFixedT(locale, 'pricing')
  const groups = buildFaqGroups(t, tPricing)
  const all = groups.flatMap((g) => g.items)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: all.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer.join(' ') },
    })),
  }
}

export function structuredDataFor(i18n: I18nInstance, meta: PageMeta): object[] {
  if (meta.path === '/' || meta.path === '/download') return [softwareApplicationSchema(i18n, meta)]
  if (meta.path === '/faq') return [faqSchema(i18n, meta.locale)]
  return []
}

export interface HeadTag {
  tag: 'meta' | 'link'
  attrs: Record<string, string>
}

/** Every per-page head tag, shared by the prerenderer and the client-side updater. */
export function headTagsFor(i18n: I18nInstance, meta: PageMeta): HeadTag[] {
  const url = absoluteUrl(localizedPath(meta.locale, meta.path))
  const image = absoluteUrl(OG_IMAGE)
  const ogImageAlt = i18n.t('ogImageAlt', { ns: 'seo' })
  const tags: HeadTag[] = [
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE.name } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.description } },
    { tag: 'meta', attrs: { property: 'og:locale', content: bcp47(meta.locale).replace('-', '_') } },
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: ogImageAlt } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: meta.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
  ]
  if (meta.indexable) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: url } })
    tags.push({ tag: 'meta', attrs: { property: 'og:url', content: url } })
    // hreflang alternates + x-default — one per active locale, pointing at
    // that locale's own URL for this same canonical page.
    for (const alt of alternatePaths(meta.path)) {
      tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: bcp47(alt.locale), href: absoluteUrl(alt.href) } })
    }
    tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: 'x-default', href: absoluteUrl(localizedPath(DEFAULT_LOCALE, meta.path)) } })
  } else {
    tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } })
  }
  return tags
}

/** Every locale × indexable-page URL — the sitemap's full set. */
export function sitemapEntries(): { path: string; changefreq?: string; priority?: number }[] {
  const entries: { path: string; changefreq?: string; priority?: number }[] = []
  for (const page of Object.values(PAGE_CONFIG).filter((p) => p.indexable)) {
    for (const locale of ACTIVE_LOCALES) {
      entries.push({ path: localizedPath(locale.code, page.path), changefreq: page.changefreq, priority: page.priority })
    }
  }
  return entries
}
