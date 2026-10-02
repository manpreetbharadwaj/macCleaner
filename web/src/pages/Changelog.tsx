import { Link } from 'react-router'
import { RELEASES } from '@/data/changelog'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

export function ChangelogPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow="Release notes" title="What’s new" intro="Every version of MacBook Cleaner and what changed." />
        </div>
      </section>
      <div className="container container--narrow releases">
        {RELEASES.map((r, i) => (
          <Reveal as="article" key={r.version} className="release" aria-labelledby={`v${r.version}`}>
            <header className="release__head">
              <h2 id={`v${r.version}`}>
                Version {r.version}
                {i === 0 && <span className="badge">Latest</span>}
              </h2>
              <p className="release__date">{r.date ? r.date : 'Release date to be announced'}</p>
            </header>
            <p className="release__title">{r.title}</p>
            <p>{r.summary}</p>
            {r.sections.map((s) => (
              <div key={s.heading} className="release__section">
                <h3>{s.heading}</h3>
                <ul>
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        ))}
        <p className="center-link">
          <Link to="/download" className="text-link">
            Download the latest version →
          </Link>
        </p>
      </div>
    </div>
  )
}
