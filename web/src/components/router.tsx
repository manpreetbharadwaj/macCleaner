import { forwardRef, useCallback } from 'react'
import { Link as RRLink, NavLink as RRNavLink, useNavigate, type LinkProps, type NavLinkProps, type NavigateOptions } from 'react-router'
import { useLocale } from '@/i18n/LocaleContext'
import { localizedPath } from '@/i18n/paths'

/**
 * Drop-in replacements for react-router's `Link`/`NavLink` that automatically
 * prefix any root-relative internal path (`/features`, `/faq#automatic`, …)
 * with the current locale, so every in-app link keeps the visitor in their
 * language instead of silently dropping back to English. External links,
 * `mailto:`/`tel:` links and hash-only same-page anchors pass through
 * unchanged. Routing hooks (`useNavigate`, `useLocation`, …) still come
 * directly from `react-router` — see `useLocalizedNavigate` below for the
 * one that needs the same treatment.
 */
function localize(locale: string, to: LinkProps['to']): LinkProps['to'] {
  if (typeof to !== 'string' || !to.startsWith('/')) return to
  const [path, hash] = to.split('#')
  const target = localizedPath(locale, path || '/')
  return hash ? `${target}#${hash}` : target
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  const { locale } = useLocale()
  return <RRLink ref={ref} to={localize(locale, to)} {...props} />
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink({ to, ...props }, ref) {
  const { locale } = useLocale()
  return <RRNavLink ref={ref} to={localize(locale, to)} {...props} />
})

/** `useNavigate`, but root-relative paths are localized the same way `<Link>` above handles them. */
export function useLocalizedNavigate() {
  const { locale } = useLocale()
  const navigate = useNavigate()
  return useCallback((to: string, options?: NavigateOptions) => navigate(localize(locale, to) as string, options), [locale, navigate])
}

