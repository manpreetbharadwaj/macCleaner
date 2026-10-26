import { APP, PURCHASE, SITE, absoluteUrl, architectureLabel } from '@/config/site'
import { ALL_FAQS } from '@/data/faq'

export interface PageMeta {
  path: string
  title: string
  description: string
  /** Included in sitemap.xml (404 is not). */
  indexable: boolean
  changefreq?: 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

export const PAGES: Record<string, PageMeta> = {
  '/': {
    path: '/',
    title: 'MacBook Cleaner — Mac Storage Cleaner & Performance Monitor',
    description:
      'Free up Mac storage safely and see how your Mac is doing. MacBook Cleaner finds caches, large files and duplicates, and shows CPU and RAM usage, running apps, battery health and Mac system information — all processed locally.',
    indexable: true,
    changefreq: 'weekly',
    priority: 1,
  },
  '/features': {
    path: '/features',
    title: 'Features — Mac Cleaner, CPU & RAM Monitor, Battery Health | MacBook Cleaner',
    description:
      'Smart Clean, Storage Explorer, Large File and Duplicate Finders, App Cleanup, plus a Mac performance monitor: CPU and memory usage, running apps, battery cycle count and health, and Mac system information.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.9,
  },
  '/pricing': {
    path: '/pricing',
    title: 'Pricing — MacBook Cleaner',
    description: `MacBook Cleaner ${APP.version}: try it free for ${PURCHASE.trialDays} days, then a single ${PURCHASE.priceDisplay} one-time payment for a lifetime license. No subscription, no account needed to start.`,
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  '/download': {
    path: '/download',
    title: 'Download MacBook Cleaner for Mac',
    description: `Download MacBook Cleaner ${APP.version} for ${APP.minMacOSName} or later on ${architectureLabel()} Macs. Installation steps and first-launch help included.`,
    indexable: true,
    changefreq: 'weekly',
    priority: 0.9,
  },
  '/faq': {
    path: '/faq',
    title: 'FAQ — Is MacBook Cleaner Safe? | MacBook Cleaner',
    description:
      'Answers about safety, privacy, permissions, performance monitoring, battery health, compatibility and installation in MacBook Cleaner, the local-first Mac cleaner and performance monitor.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.7,
  },
  '/support': {
    path: '/support',
    title: 'Support — MacBook Cleaner',
    description: 'Get help with MacBook Cleaner: installation help, bug reports, feature requests and contact details.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.5,
  },
  '/changelog': {
    path: '/changelog',
    title: 'Release Notes — MacBook Cleaner',
    description: 'What’s new in each version of MacBook Cleaner for macOS.',
    indexable: true,
    changefreq: 'monthly',
    priority: 0.5,
  },
  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy — MacBook Cleaner',
    description: 'How MacBook Cleaner and this website handle your information. The app scans, cleans and monitors locally and sends no data about your files or your Mac.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.4,
  },
  '/terms': {
    path: '/terms',
    title: 'Terms of Service — MacBook Cleaner',
    description: 'The terms that apply to downloading and using MacBook Cleaner.',
    indexable: true,
    changefreq: 'yearly',
    priority: 0.3,
  },
}

export const NOT_FOUND_META: PageMeta = {
  path: '/404',
  title: 'Page not found — MacBook Cleaner',
  description: 'The page you were looking for doesn’t exist.',
  indexable: false,
}

export function metaFor(pathname: string): PageMeta {
  const stripped = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '')
  const normalized = stripped.length > 1 ? stripped.replace(/\/+$/, '') : stripped
  return PAGES[normalized] ?? NOT_FOUND_META
}

const OG_IMAGE = '/og-image.jpg'

function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: `macOS ${APP.minMacOS} or later`,
    softwareVersion: APP.version,
    description: PAGES['/'].description,
    url: absoluteUrl('/'),
    downloadUrl: absoluteUrl('/download'),
    image: absoluteUrl(OG_IMAGE),
    screenshot: [absoluteUrl('/screens/dashboard.jpg'), absoluteUrl('/screens/performance.jpg')],
    featureList: [
      'Mac storage cleaner',
      'Storage analyzer',
      'Large file finder',
      'Duplicate file finder',
      'App uninstaller',
      'CPU and memory monitor',
      'Running apps monitor',
      'Battery health and cycle count',
      'Mac system information',
    ],
  }
}

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer.join(' ') },
    })),
  }
}

export function structuredDataFor(meta: PageMeta): object[] {
  if (meta.path === '/' || meta.path === '/download') return [softwareApplicationSchema()]
  if (meta.path === '/faq') return [faqSchema()]
  return []
}

export interface HeadTag {
  tag: 'meta' | 'link'
  attrs: Record<string, string>
}

/** Every per-page head tag, shared by the prerenderer and the client-side updater. */
export function headTagsFor(meta: PageMeta): HeadTag[] {
  const url = absoluteUrl(meta.path)
  const image = absoluteUrl(OG_IMAGE)
  const tags: HeadTag[] = [
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE.name } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.title } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.description } },
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: 'MacBook Cleaner app showing a storage breakdown' } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: meta.title } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
  ]
  if (meta.indexable) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: url } })
    tags.push({ tag: 'meta', attrs: { property: 'og:url', content: url } })
  } else {
    tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex' } })
  }
  return tags
}
