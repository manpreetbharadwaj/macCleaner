import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Bug, CircleHelp, Download, Lightbulb, Mail, ScrollText } from 'lucide-react'
import { APP, SITE } from '@/config/site'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'

function mailto(subject: string, body = ''): string {
  const params = new URLSearchParams({ subject, ...(body ? { body } : {}) })
  return `mailto:${SITE.supportEmail}?${params.toString().replace(/\+/g, '%20')}`
}

const BUG_TEMPLATE = `What happened:


What you expected:


Steps to reproduce:
1.
2.

MacBook Cleaner version: ${APP.version}
macOS version:
Mac model / chip:
`

const FEATURE_TEMPLATE = `What would you like MacBook Cleaner to do?


Why would it help you?
`

const CARDS = [
  { icon: Mail, color: '#5b6cff', title: 'Email support', body: 'Questions about using the app? Write to us and we’ll get back to you.', href: mailto('MacBook Cleaner support'), cta: SITE.supportEmail, external: true },
  { icon: Bug, color: '#e5484d', title: 'Report a bug', body: 'Something not working? Opens an email with a short template to fill in.', href: mailto(`Bug report — MacBook Cleaner ${APP.version}`, BUG_TEMPLATE), cta: 'Report a bug', external: true },
  { icon: Lightbulb, color: '#f5b400', title: 'Request a feature', body: 'Tell us what would make MacBook Cleaner more useful to you.', href: mailto('Feature request — MacBook Cleaner', FEATURE_TEMPLATE), cta: 'Suggest a feature', external: true },
  { icon: Download, color: '#19c39a', title: 'Installation help', body: 'Step-by-step install instructions and what to do about the first-launch security warning.', href: '/download#install', cta: 'Installation guide', external: false },
  { icon: CircleHelp, color: '#13b5e0', title: 'FAQ', body: 'Safety, privacy, permissions, compatibility and uninstalling — answered.', href: '/faq', cta: 'Browse the FAQ', external: false },
]

export function SupportPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <SectionHeading level={1} eyebrow="Support" title="How can we help?" intro="Most answers are in the FAQ. For anything else, email is the fastest way to reach us." />
        </div>
      </section>
      <section className="section section--flush">
        <div className="container">
          <div className="support-grid">
            {CARDS.map((c, i) => {
              const Icon = c.icon
              const inner = (
                <>
                  <span className="icon-tile" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h2>{c.title}</h2>
                  <p>{c.body}</p>
                  <span className="support-card__cta">{c.cta} →</span>
                </>
              )
              return (
                <Reveal key={c.title} className="support-card" delay={(i % 3) * 60} style={{ '--c': c.color } as CSSProperties}>
                  {c.external ? (
                    <a href={c.href} className="support-card__link">
                      {inner}
                    </a>
                  ) : (
                    <Link to={c.href} className="support-card__link">
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
              <h2>Sending diagnostic logs</h2>
              <p>
                For tricky problems we may ask for the app’s logs. They’re stored only on your Mac, in <code>~/Library/Logs/{APP.bundleId}</code>, and are never sent automatically. Logs can contain file paths from your Mac — look them over and remove
                anything you’d rather not share before attaching them.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
