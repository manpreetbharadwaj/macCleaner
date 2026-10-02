import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import { SITE } from '@/config/site'
import { FAQ_GROUPS } from '@/data/faq'
import { FAQAccordion } from '@/components/FAQAccordion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

export function FAQPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow="FAQ" title="Frequently asked questions" intro="Straight answers about safety, privacy, compatibility and how MacBook Cleaner works." />
          <nav className="chip-nav" aria-label="FAQ topics">
            {FAQ_GROUPS.map((g) => (
              <a key={g.title} href={`#${slug(g.title)}`} className="chip-nav__item">
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <div className="container container--narrow faq-page">
        {FAQ_GROUPS.map((g) => (
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
            <h2>Still have a question?</h2>
            <p>
              Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or visit <Link to="/support">Support</Link>.
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
