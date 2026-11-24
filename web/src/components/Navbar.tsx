import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { useScrolled } from '@/hooks/useScrolled'
import { cx } from '@/utils/format'
import { DownloadButton } from './DownloadButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { NavLink } from './router'

const NAV_KEYS = [
  { to: '/features', key: 'features' },
  { to: '/pricing', key: 'pricing' },
  { to: '/download', key: 'download' },
  { to: '/faq', key: 'faq' },
  { to: '/support', key: 'support' },
] as const

export function Navbar() {
  const { t } = useTranslation('common')
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('menu-open')
    }
  }, [open])

  return (
    <header className={cx('nav', (scrolled || open) && 'is-scrolled', open && 'is-open')}>
      <div className="container nav__inner">
        <Logo />
        <nav className="nav__links" aria-label={t('aria.primaryNav')}>
          {NAV_KEYS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('nav__link', isActive && 'is-active')}>
              {t(`nav.${l.key}`)}
            </NavLink>
          ))}
        </nav>
        <LanguageSwitcher className="nav__lang--desktop" />
        <div className="nav__cta">
          <DownloadButton size="md" label={t('download.navCta')} />
        </div>
        <button type="button" className="nav__toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setOpen((v) => !v)}>
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      <div id="mobile-menu" className="nav__mobile" hidden={!open}>
        <nav className="container" aria-label={t('aria.mobileNav')}>
          {NAV_KEYS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('nav__mobile-link', isActive && 'is-active')}>
              {t(`nav.${l.key}`)}
            </NavLink>
          ))}
          <LanguageSwitcher />
          <DownloadButton size="lg" className="nav__mobile-cta" />
        </nav>
      </div>
    </header>
  )
}
