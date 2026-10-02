import { Outlet, useLocation } from 'react-router'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { ScrollManager } from './ScrollManager'

export function Layout() {
  const { pathname } = useLocation()
  useDocumentMeta(pathname)
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="bg-glow" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <ScrollManager />
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
