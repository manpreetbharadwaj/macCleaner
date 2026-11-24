import type { RouteObject } from 'react-router'
import { LocaleLayout } from '@/components/LocaleLayout'
import { ChangelogPage } from '@/pages/Changelog'
import { DownloadPage } from '@/pages/Download'
import { FAQPage } from '@/pages/FAQ'
import { FeaturesPage } from '@/pages/Features'
import { HomePage } from '@/pages/Home'
import { NotFoundPage } from '@/pages/NotFound'
import { PricingPage } from '@/pages/Pricing'
import { PrivacyPage } from '@/pages/Privacy'
import { SupportPage } from '@/pages/Support'
import { TermsPage } from '@/pages/Terms'
import { ThankYouPage } from '@/pages/ThankYou'

/**
 * Shared leaf routes, reused under both parent routes below — react-router's
 * <Routes> can't see <Route> elements returned from a custom component, so
 * this uses the data-router `RouteObject` form (via `useRoutes` in App.tsx)
 * instead of JSX, which has no such restriction on reusing one array twice.
 */
const pageRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'features', element: <FeaturesPage /> },
  { path: 'pricing', element: <PricingPage /> },
  { path: 'download', element: <DownloadPage /> },
  { path: 'faq', element: <FAQPage /> },
  { path: 'support', element: <SupportPage /> },
  { path: 'thank-you', element: <ThankYouPage /> },
  { path: 'changelog', element: <ChangelogPage /> },
  { path: 'privacy', element: <PrivacyPage /> },
  { path: 'terms', element: <TermsPage /> },
  { path: '*', element: <NotFoundPage /> },
]

/**
 * Two parallel trees: the default, unprefixed one (English, backwards
 * compatible with every URL this site has ever had) and one with a `:locale`
 * param for the other 15 languages (`/de/features`, `/ja/pricing`, …).
 * LocaleLayout validates `:locale` itself and renders a 404 for anything
 * that isn't one of the active locale codes.
 */
export const routeConfig: RouteObject[] = [
  { element: <LocaleLayout prefixed={false} />, children: pageRoutes },
  { path: ':locale', element: <LocaleLayout prefixed={true} />, children: pageRoutes },
]
