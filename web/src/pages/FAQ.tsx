import { useTranslation, Trans } from 'react-i18next'
import { Mail } from 'lucide-react'
import { SITE } from '@/config/site'
import { useFaqGroups } from '@/data/faq'
import { FAQAccordion } from '@/components/FAQAccordion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { Link } from '@/components/router'

export function FAQPage() {
  const { t } = useTranslation('faq')
  const groups = useFaqGroups()
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')} />
          <nav className="chip-nav" aria-label={t('topicsAria')}>
            {groups.map((g) => (
              <a key={g.title} href={`#${slug(g.title)}`} className="chip-nav__item">
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <div className="container container--narrow faq-page">
        {groups.map((g) => (
          <section key={g.title} id={slug(g.title)} className="faq-group" aria-labelledby={`${slug(g.title)}-h`}>
            <Reveal>
              <h2 id={`${slug(g.title)}-h`} className="faq-group__title">
                {g.title}
              </h2>
              <FAQAccordion items={g.items} />
            </Reveal>
          </section>
        ))}
        <Reveal className="callout">
          <Mail size={22} aria-hidden="true" />
          <div>
            <h2>{t('stillHaveQuestion')}</h2>
            <p>
              <Trans
                t={t}
                i18nKey="contactLine"
                values={{ email: SITE.supportEmail }}
                components={{ email: <a href={`mailto:${SITE.supportEmail}`} />, support: <Link to="/support" /> }}
              />
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
