import { useTranslation } from 'react-i18next'
import { APP, DOWNLOAD } from '@/config/site'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { Link } from '@/components/router'

const RELEASE_KEYS = ['firstRelease']
const SECTION_KEYS = ['cleanupTools', 'performance', 'automation', 'safety', 'interface']

export function ChangelogPage() {
  const { t } = useTranslation('changelog')
  const date = DOWNLOAD.releaseDate || DOWNLOAD.buildDate

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} intro={t('intro')} />
        </div>
      </section>
      <div className="container container--narrow releases">
        {RELEASE_KEYS.map((key, i) => (
          <Reveal as="article" key={key} className="release" aria-labelledby={`v${APP.version}`}>
            <header className="release__head">
              <h2 id={`v${APP.version}`}>
                {APP.version}
                {i === 0 && <span className="badge">{t('latestBadge')}</span>}
              </h2>
              <p className="release__date">{date || t('dateUnannounced')}</p>
            </header>
            <p className="release__title">{t(`releases.${key}.title`)}</p>
            <p>{t(`releases.${key}.summary`)}</p>
            {SECTION_KEYS.map((sectionKey) => {
              const items = t(`releases.${key}.sections.${sectionKey}.items`, { returnObjects: true }) as string[]
              return (
                <div key={sectionKey} className="release__section">
                  <h3>{t(`releases.${key}.sections.${sectionKey}.heading`)}</h3>
                  <ul>
                    {items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </Reveal>
        ))}
        <p className="center-link">
          <Link to="/download" className="text-link">
            {t('downloadLatest')}
          </Link>
        </p>
      </div>
    </div>
  )
}
