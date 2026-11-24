import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { APP, PURCHASE, SITE, architectureLabel } from '@/config/site'

export interface FaqItem {
  id: string
  question: string
  /** Paragraphs of plain text (also used verbatim in FAQPage structured data). */
  answer: string[]
  link?: { label: string; to: string }
}

export interface FaqGroup {
  title: string
  items: FaqItem[]
}

const GROUP_IDS = ['basics', 'safety', 'compatibility', 'performance', 'automation'] as const
const ITEM_IDS_BY_GROUP: Record<(typeof GROUP_IDS)[number], string[]> = {
  basics: ['what-is-it', 'what-files', 'free', 'faster'],
  safety: ['safe', 'review', 'recover', 'upload', 'permissions'],
  compatibility: ['apple-silicon', 'intel', 'macos-versions', 'security-warning', 'uninstall'],
  performance: ['cpu', 'ram-apps', 'cycle-count', 'upload-apps', 'mac-model', 'macos-update', 'monitoring-overhead'],
  automation: ['how-often', 'automatic'],
}

const LINK_TARGETS: Record<string, string> = {
  upload: '/privacy',
  'security-warning': '/download#open-anyway',
  'upload-apps': '/privacy',
}

/**
 * Builds the full FAQ, translated into the active locale, with the same
 * conditional logic the English version always had (architecture/notarization
 * claims only ever reflect a verified build — see config/site.ts) — only the
 * *text* moves to locales/<lang>/faq.json, keyed by these stable ids. Takes
 * plain `t` functions (not the hook) so it can also run outside React, in
 * entry-server.tsx's SSR-time FAQPage structured-data generation.
 */
export function buildFaqGroups(t: TFunction, tPricing: TFunction): FaqGroup[] {
  const intel = APP.architectures.includes('intel')

  return GROUP_IDS.map((groupId) => {
    const items: FaqItem[] = []
    for (const id of ITEM_IDS_BY_GROUP[groupId]) {
      if (id === 'security-warning' && APP.notarized) continue
      const base = `groups.${groupId}.items.${id}`
      let answer: string[]
      if (id === 'apple-silicon') {
        answer = t(`${base}.${APP.architectures.includes('apple-silicon') ? 'answerYes' : 'answerUnverified'}`, { returnObjects: true }) as string[]
      } else if (id === 'intel') {
        const key = !APP.installerVerified ? 'answerUnverified' : intel ? 'answerUniversal' : 'answerNo'
        answer = t(`${base}.${key}`, { returnObjects: true }) as string[]
      } else if (id === 'macos-versions') {
        answer = t(`${base}.answer`, { returnObjects: true, macosName: APP.minMacOSName, macosVersion: APP.minMacOS, architecture: architectureLabel() }) as string[]
      } else if (id === 'free') {
        answer = t(`${base}.answer`, { returnObjects: true, trialDays: PURCHASE.trialDays, price: PURCHASE.priceDisplay, priceNote: tPricing('priceNote') }) as string[]
      } else if (id === 'uninstall') {
        answer = t(`${base}.answer`, { returnObjects: true, bundleId: APP.bundleId }) as string[]
      } else {
        answer = t(`${base}.answer`, { returnObjects: true }) as string[]
      }
      items.push({
        id,
        question: t(`${base}.question`),
        answer,
        link: LINK_TARGETS[id] ? { label: t(`${base}.linkLabel`), to: LINK_TARGETS[id] } : undefined,
      })
    }
    return { title: t(`groups.${groupId}.title`), items }
  })
}

export function useFaqGroups(): FaqGroup[] {
  const { t } = useTranslation('faq')
  const { t: tPricing } = useTranslation('pricing')
  return buildFaqGroups(t, tPricing)
}

export function useAllFaqs(): FaqItem[] {
  return useFaqGroups().flatMap((g) => g.items)
}

/** A short selection for the home page. */
export const HOME_FAQ_IDS = ['safe', 'upload', 'upload-apps', 'recover', 'faster', 'cycle-count', 'monitoring-overhead', 'security-warning']

export function useHomeFaqs(): FaqItem[] {
  const all = useAllFaqs()
  return HOME_FAQ_IDS.map((id) => all.find((f) => f.id === id)).filter((f): f is FaqItem => !!f)
}

export const SUPPORT_EMAIL = SITE.supportEmail
