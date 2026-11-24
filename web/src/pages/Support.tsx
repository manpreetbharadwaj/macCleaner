import type { CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bug, CircleHelp, Download, Lightbulb, Mail, ScrollText } from 'lucide-react'
import { APP, SITE } from '@/config/site'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { Link } from '@/components/router'

function mailto(subject: string, body = ''): string {
  const params = new URLSearchParams({ subject, ...(body ? { body } : {}) })
  return `mailto:${SITE.supportEmail}?${params.toString().replace(/\+/g, '%20')}`
}

const CARD_META = [
  { key: 'email', icon: Mail, color: '#5b6cff', external: true },
  { key: 'bug', icon: Bug, color: '#e5484d', external: true },
  { key: 'feature', icon: Lightbulb, color: '#f5b400', external: true },
  { key: 'install', icon: Download, color: '#19c39a', href: '/download#install', external: false },
  { key: 'faq', icon: CircleHelp, color: '#13b5e0', href: '/faq', external: false },
] as const

export function SupportPage() {
  const { t } = useTranslation('support')

  const bugTemplate = `${t('bugTemplate.body', { version: APP.version })}`
  const featureTemplate = t('featureTemplate.body')
  const hrefFor = (key: (typeof CARD_META)[number]['key']): string => {
    if (key === 'email') return mailto(t('emailSubject'))
    if (key === 'bug') return mailto(t('bugTemplate.subject', { version: APP.version }), bugTemplate)
    if (key === 'feature') return mailto(t('featureTemplate.subject'), featureTemplate)
    return ''
  }

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')} />
        </div>
      </section>
      <section className="section section--flush">
        <div className="container">
          <div className="support-grid">
            {CARD_META.map((c, i) => {
              const Icon = c.icon
              const cta = c.key === 'email' ? SITE.supportEmail : t(`cards.${c.key}.cta`)
              const href = 'href' in c ? c.href : hrefFor(c.key)
              const inner = (
                <>
                  <span className="icon-tile" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h2>{t(`cards.${c.key}.title`)}</h2>
                  <p>{t(`cards.${c.key}.body`)}</p>
                  <span className="support-card__cta">{cta} →</span>
                </>
              )
              return (
                <Reveal key={c.key} className="support-card" delay={(i % 3) * 60} style={{ '--c': c.color } as CSSProperties}>
                  {c.external ? (
                    <a href={href} className="support-card__link">
                      {inner}
                    </a>
                  ) : (
                    <Link to={href} className="support-card__link">
                      {inner}
                    </Link>
                  )}
                </Reveal>
              )
            })}
          </div>

          <Reveal className="callout callout--info">
            <ScrollText size={22} aria-hidden="true" />
            <div>
              <h2>{t('logsTitle')}</h2>
              <p>
                <Trans t={t} i18nKey="logsBody" values={{ bundleId: APP.bundleId }} components={{ code: <code /> }} />
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
