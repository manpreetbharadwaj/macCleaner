import { Link } from 'react-router'
import { APP, SITE } from '@/config/site'
import { Logo } from './Logo'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/download', label: 'Download' },
      { to: '/changelog', label: 'Release Notes' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/support', label: 'Support' },
      { to: '/download#install', label: 'Installation' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo size={32} />
            <p>{SITE.tagline} Safe, local-first storage cleanup and performance monitoring for macOS.</p>
            <p className="footer__meta">
              Version {APP.version} · {APP.minMacOSName} or later
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} className="footer__col" aria-label={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer__bottom">
          <p>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {SITE.name}. All rights reserved.
          </p>
          <p>
            {SITE.name} is an independent application and is not affiliated with, endorsed by, or sponsored by Apple Inc. Apple, Mac, MacBook, macOS, Finder,
            Safari and Xcode are trademarks of Apple Inc., registered in the U.S. and other countries.
          </p>
        </div>
      </div>
    </footer>
  )
}
