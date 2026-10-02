import { Link } from 'react-router'
import { APP, architectureLabel } from '@/config/site'
import { DownloadButton } from '@/components/DownloadButton'
import { Reveal } from '@/components/Reveal'

export function FinalCta({ title = 'Give your Mac some breathing room.' }: { title?: string }) {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <div className="container">
        <Reveal className="cta-card">
          <img src="/app-icon-256.png" alt="" width={104} height={104} loading="lazy" className="cta-card__icon" />
          <h2 id="cta-title" className="display-2">
            {title}
          </h2>
          <p>
            Version {APP.version} · {APP.minMacOSName} or later · {architectureLabel()}
          </p>
          <div className="cta-card__actions">
            <DownloadButton variant="light" />
            <Link to="/download#install" className="btn btn--ghost-light btn--lg">
              Installation guide
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
