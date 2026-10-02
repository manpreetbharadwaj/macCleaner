import type { ReactNode } from 'react'
import { SITE } from '@/config/site'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

export function LegalLayout({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="page legal">
      <div className="container legal__grid">
        <header className="legal__header">
          <p className="eyebrow">Legal</p>
          <h1 className="display-1">{title}</h1>
          <p className="legal__updated">Last updated: {SITE.legalLastUpdated}</p>
          <div className="legal__intro">{intro}</div>
        </header>
        <nav className="legal__toc" aria-label="On this page">
          <p>On this page</p>
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
