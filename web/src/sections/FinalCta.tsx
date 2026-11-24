import { useTranslation } from 'react-i18next'
import { APP, architectureLabel } from '@/config/site'
import { DownloadButton } from '@/components/DownloadButton'
import { Reveal } from '@/components/Reveal'
import { Link } from '@/components/router'

export function FinalCta({ title }: { title?: string }) {
  const { t } = useTranslation('home')
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <div className="container">
        <Reveal className="cta-card">
          <img src="/app-icon-256.png" alt="" width={104} height={104} loading="lazy" className="cta-card__icon" />
          <h2 id="cta-title" className="display-2">
            {title ?? t('finalCta.defaultTitle')}
          </h2>
          <p>{t('finalCta.meta', { version: APP.version, macos: APP.minMacOSName, architecture: architectureLabel() })}</p>
          <div className="cta-card__actions">
            <DownloadButton variant="light" />
            <Link to="/download#install" className="btn btn--ghost-light btn--lg">
              {t('finalCta.installationGuide')}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
