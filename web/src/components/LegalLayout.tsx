import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { SITE } from '@/config/site'
import { DEFAULT_LOCALE } from '@/i18n/locales'
import { useLocale } from '@/i18n/LocaleContext'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

export function LegalLayout({ title, intro, sections, legalReviewNotice }: { title: string; intro: ReactNode; sections: LegalSection[]; legalReviewNotice?: string }) {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  return (
    <div className="page legal">
      <div className="container legal__grid">
        <header className="legal__header">
          <p className="eyebrow">{t('legal.eyebrow')}</p>
          <h1 className="display-1">{title}</h1>
          <p className="legal__updated">{t('legal.lastUpdated', { date: SITE.legalLastUpdated })}</p>
          {locale !== DEFAULT_LOCALE && legalReviewNotice && (
            <p className="legal__notice">
              <AlertTriangle size={16} aria-hidden="true" /> {legalReviewNotice}
            </p>
          )}
          <div className="legal__intro">{intro}</div>
        </header>
        <nav className="legal__toc" aria-label={t('legal.onThisPage')}>
          <p>{t('legal.onThisPage')}</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="legal__body prose">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <span className="legal__num">{i + 1}.</span> {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
