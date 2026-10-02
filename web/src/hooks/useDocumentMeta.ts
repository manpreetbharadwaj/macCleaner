import { useEffect } from 'react'
import { headTagsFor, metaFor, structuredDataFor } from '@/data/seo'

/**
 * Keeps <title>, meta description, canonical, Open Graph, Twitter and JSON-LD
 * in sync on client-side navigation. The first paint already has the right
 * tags — scripts/prerender.mjs writes them into each page's HTML — so this
 * only matters after the user navigates within the site.
 */
export function useDocumentMeta(pathname: string) {
  useEffect(() => {
    const meta = metaFor(pathname)
    document.title = meta.title
    document.head.querySelectorAll('[data-head]').forEach((el) => el.remove())
    for (const { tag, attrs } of headTagsFor(meta)) {
      const el = document.createElement(tag)
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.setAttribute('data-head', '')
      document.head.appendChild(el)
    }
    for (const data of structuredDataFor(meta)) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-head', '')
      script.textContent = JSON.stringify(data)
      document.head.appendChild(script)
    }
  }, [pathname])
}
