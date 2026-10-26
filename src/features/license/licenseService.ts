import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '@/services/environment'
import type { LicenseState } from './types'
import { mockLicenseService } from './mockLicenseService'

/**
 * Trial/license state. The Tauri implementation reads/writes the macOS
 * Keychain and talks to Dodo Payments (src-tauri/src/license); the mock is
 * only used by the plain-browser preview (`npm run dev`), like the rest of
 * the app — it always reports "licensed" so the preview is never gated.
 */
export interface LicenseService {
  getState(): Promise<LicenseState>
  refresh(): Promise<LicenseState>
  activate(licenseKey: string): Promise<LicenseState>
  deactivate(): Promise<LicenseState>
  openPurchasePage(): Promise<void>
}

const tauriLicenseService: LicenseService = {
  getState: () => invoke('license_get_state'),
  refresh: () => invoke('license_refresh'),
  activate: (licenseKey) => invoke('license_activate', { licenseKey }),
  deactivate: () => invoke('license_deactivate'),
  openPurchasePage: () => invoke('license_open_purchase_page'),
}

export const licenseService: LicenseService = isTauriRuntime() ? tauriLicenseService : mockLicenseService
