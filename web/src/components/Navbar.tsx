import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import { useScrolled } from '@/hooks/useScrolled'
import { cx } from '@/utils/format'
import { DownloadButton } from './DownloadButton'
import { Logo } from './Logo'

export const NAV_LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/download', label: 'Download' },
  { to: '/faq', label: 'FAQ' },
  { to: '/support', label: 'Support' },
]

export function Navbar() {
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
        <nav className="nav__links" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('nav__link', isActive && 'is-active')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav__cta">
          <DownloadButton size="md" label="Download" />
        </div>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      <div id="mobile-menu" className="nav__mobile" hidden={!open}>
        <nav className="container" aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('nav__mobile-link', isActive && 'is-active')}>
              {l.label}
            </NavLink>
          ))}
          <DownloadButton size="lg" className="nav__mobile-cta" />
        </nav>
      </div>
    </header>
  )
}
