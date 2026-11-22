/**
 * Single source of truth for everything that changes between environments
 * or still needs a real value before launch. Nothing else in the site
 * hardcodes URLs, emails, version numbers or legal names — change them here
 * (or via the VITE_* variables documented in .env.example).
 */

import installerJson from './installer.generated.json'

const env = import.meta.env

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

export const SITE = {
  name: 'MacBook Cleaner',
  tagline: 'Clean your Mac. Keep what matters.',
  /**
   * Public origin, no trailing slash. Production domain is macbookcleaner.com
   * (confirmed: registered via Hostinger, deployed on Cloudflare Pages). The
   * desktop app's own hardcoded references (Settings.tsx, license/config.rs's
   * THANK_YOU_URL, external_url.rs's ALLOWED_HOSTS, update/UpdateSection.tsx)
   * were updated to match in the same round — ALLOWED_HOSTS permits both
   * .com and .app so neither can ever become a broken/blocked link.
   */
  url: (clean(env.VITE_SITE_URL) || 'https://macbookcleaner.com').replace(/\/+$/, ''),
  /** PLACEHOLDER — the legal entity that publishes the app. */
  companyName: '[Company Legal Name]',
  /** PLACEHOLDER — postal address used in the legal pages. */
  companyAddress: '[Company Address]',
  /** PLACEHOLDER — governing law / jurisdiction for the Terms. */
  jurisdiction: '[Governing Jurisdiction]',
  supportEmail: clean(env.VITE_SUPPORT_EMAIL) || 'support@macbookcleaner.com',
  privacyEmail: clean(env.VITE_PRIVACY_EMAIL) || 'privacy@macbookcleaner.com',
  /**
   * Confirmed this round: deployed on Cloudflare Pages. If the installer DMG
   * ends up hosted elsewhere (e.g. GitHub Releases, via VITE_MAC_DOWNLOAD_URL),
   * update `downloadHost` below to match — this value assumes the default
   * "hosted with the site" case (prepare-installer.mjs's `hostedWithSite`).
   */
  hostingProvider: 'Cloudflare Pages (Cloudflare, Inc.)',
  /** Matches hostingProvider by default — see the comment above if the DMG is hosted elsewhere. */
  downloadHost: 'Cloudflare Pages (Cloudflare, Inc.)',
  /** Date the Privacy Policy and Terms were last revised. */
  legalLastUpdated: 'October 1, 2026',
} as const

/**
 * Facts about the installer actually being offered, written by
 * scripts/prepare-installer.mjs after it mounts the DMG and inspects the app
 * inside (lipo, codesign, stapler). Never edited by hand.
 */
interface InstallerMeta {
  available: boolean
  url: string | null
  hostedWithSite?: boolean
  fileName?: string
  version: string
  sizeBytes?: number
  sha256?: string
  builtAt?: string
  minimumSystemVersion?: string
  architectures?: string[]
  signature?: 'adhoc' | 'developer-id' | 'other' | 'unsigned'
  notarized?: boolean
}
const installer = installerJson as InstallerMeta
const archs = installer.architectures ?? []

export const APP = {
  /** Read from src-tauri/tauri.conf.json at build time. */
  version: __APP_VERSION__,
  bundleId: __APP_BUNDLE_ID__,
  /** Read from tauri.conf.json → bundle.macOS.minimumSystemVersion. */
  minMacOS: __APP_MIN_MACOS__,
  minMacOSName: macOSName(__APP_MIN_MACOS__),
  /** Architectures inside the published DMG (from `lipo`). */
  architectures: [...(archs.includes('arm64') ? ['apple-silicon'] : []), ...(archs.includes('x86_64') ? ['intel'] : [])] as Array<'apple-silicon' | 'intel'>,
  /** True only when architecture metadata came from inspecting a local DMG. */
  installerVerified: installer.available && archs.length > 0,
  /**
   * Whether the published app carries a stapled Apple notarization ticket
   * (from `stapler validate`). While false, the Download page and FAQ explain
   * the first-launch Gatekeeper warning.
   */
  notarized: installer.notarized ?? false,
  /** "adhoc" = signed without an Apple Developer ID. */
  signature: installer.signature ?? 'unsigned',
} as const

/**
 * The one place the download link comes from. Override with
 * VITE_MAC_DOWNLOAD_URL (e.g. a GitHub Release asset URL); otherwise the
 * verified DMG copied into /downloads/ by prepare-installer.mjs is used.
 */
export const DOWNLOAD = {
  url: clean(env.VITE_MAC_DOWNLOAD_URL) || installer.url || '',
  fileName: installer.fileName ?? `MacBook-Cleaner-${__APP_VERSION__}.dmg`,
  sizeBytes: installer.sizeBytes ?? null,
  /** Decimal MB, the way Finder shows file sizes. */
  size: installer.sizeBytes ? `${(installer.sizeBytes / 1e6).toFixed(1)} MB` : '',
  /** Optional public release date (VITE_RELEASE_DATE); otherwise the build date is shown as such. */
  releaseDate: clean(env.VITE_RELEASE_DATE),
  buildDate: installer.builtAt ? new Date(installer.builtAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '',
  sha256: installer.sha256 ?? '',
} as const

export const isDownloadAvailable = DOWNLOAD.url.length > 0

/**
 * Lifetime license purchase, via Dodo Payments. One-time payment, no
 * subscription — see src-tauri/src/license/ for the desktop app's matching
 * trial/activation system.
 *
 * SANDBOX LINK BY DEFAULT — `checkoutUrl` falls back to Dodo's **Test Mode**
 * payment link (`test.checkout.dodopayments.com`), the same sandbox product
 * the desktop app's own `dodo_test_mode` Cargo feature points at. Override
 * with VITE_DODO_CHECKOUT_URL (the live `checkout.dodopayments.com/buy/...`
 * link) before this site is actually launched — do not ship the sandbox
 * link to real customers.
 */
export const PURCHASE = {
  priceDisplay: '$14.99',
  /**
   * Honest qualifier for every place `priceDisplay` is shown: Dodo Payments
   * (the merchant of record) converts to the customer's local currency via
   * Adaptive Currency and may add tax/VAT depending on jurisdiction — the
   * $14.99 USD list price is not necessarily the exact final charge for
   * every customer.
   */
  priceNote: 'USD list price. Shown in your local currency at checkout; tax may apply depending on your location.',
  trialDays: 2,
  checkoutUrl: clean(env.VITE_DODO_CHECKOUT_URL) || 'https://test.checkout.dodopayments.com/buy/pdt_0NqQ5ZKXDNgbggDrQaV2d?quantity=1',
  isSandbox: !clean(env.VITE_DODO_CHECKOUT_URL),
} as const

export function architectureLabel(): string {
  const a = APP.architectures
  if (a.length === 0) return 'Architecture pending verified build'
  if (a.includes('apple-silicon') && a.includes('intel')) return 'Apple silicon & Intel'
  return a.includes('intel') ? 'Intel' : 'Apple silicon'
}

function macOSName(version: string): string {
  const major = Number.parseInt(version, 10)
  const names: Record<number, string> = { 11: 'Big Sur', 12: 'Monterey', 13: 'Ventura', 14: 'Sonoma', 15: 'Sequoia', 26: 'Tahoe' }
  return names[major] ? `macOS ${major} ${names[major]}` : `macOS ${version}`
}

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path === '/' ? '/' : path}`
}
