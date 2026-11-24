import { useTranslation } from 'react-i18next'
import { APP, SITE } from '@/config/site'
import { Link } from './router'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

const COLUMNS = [
  { titleKey: 'product', links: [{ to: '/features', key: 'features' }, { to: '/pricing', key: 'pricing' }, { to: '/download', key: 'download' }, { to: '/changelog', key: 'releaseNotes' }] },
  { titleKey: 'help', links: [{ to: '/faq', key: 'faq' }, { to: '/support', key: 'support' }, { to: '/download#install', key: 'installation' }] },
  { titleKey: 'legal', links: [{ to: '/privacy', key: 'privacy' }, { to: '/terms', key: 'terms' }] },
] as const

export function Footer() {
  const { t } = useTranslation('common')
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo size={32} />
            <p>
              {t('tagline')} {t('footer.description')}
            </p>
            <p className="footer__meta">{t('footer.version', { version: APP.version, macos: APP.minMacOSName })}</p>
            <LanguageSwitcher />
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.titleKey} className="footer__col" aria-label={t(`footer.columns.${col.titleKey}`)}>
              <h2>{t(`footer.columns.${col.titleKey}`)}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to}>{t(`footer.links.${l.key}`)}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer__bottom">
          <p>{t('footer.copyright', { year: new Date().getFullYear(), name: SITE.name })}</p>
          <p>{t('footer.trademark', { name: SITE.name })}</p>
        </div>
      </div>
    </footer>
  )
}
