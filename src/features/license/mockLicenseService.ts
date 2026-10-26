import type { LicenseService } from './licenseService'
import type { LicenseState, LicenseStatus } from './types'

const delay = <T,>(value: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(value), ms))

const DAY = 24 * 60 * 60 * 1000

/**
 * The browser preview always reports "licensed" by default, so the
 * marketing-site dev server and any browser-mode testing of other features
 * is never blocked by the paywall. For exercising the paywall itself during
 * development, set `window.localStorage.__mockLicenseStatus` to one of the
 * LicenseStatus values and reload — this never ships to the desktop app,
 * which always uses the real Tauri service.
 */
function forcedStatus(): LicenseStatus {
  try {
    const raw = window.localStorage.getItem('__mockLicenseStatus')
    if (raw === 'trial' || raw === 'trial_expired' || raw === 'licensed' || raw === 'licensed_invalid' || raw === 'licensed_grace_expired') return raw
  } catch {
    // ignore — localStorage can throw in a locked-down preview context
  }
  return 'licensed'
}

function stateFor(status: LicenseStatus): LicenseState {
  const now = Date.now()
  const trialStartedAtMs = now - DAY
  const trialEndsAtMs = trialStartedAtMs + 2 * DAY
  return {
    status,
    trialStartedAtMs,
    trialEndsAtMs,
    remainingMs: status === 'trial' ? Math.max(0, trialEndsAtMs - now) : 0,
    licenseKeyMasked: status.startsWith('licensed') ? '•••-••••-••••-DEMO' : null,
    lastValidatedAtMs: status.startsWith('licensed') ? now - DAY : null,
    graceRemainingMs: status === 'licensed' ? 13 * DAY : 0,
    tamperDetected: false,
  }
}

export const mockLicenseService: LicenseService = {
  getState: () => delay(stateFor(forcedStatus())),
  refresh: () => delay(stateFor(forcedStatus())),
  activate: (licenseKey) => {
    if (!licenseKey.trim()) return Promise.reject('Enter a license key first.')
    return delay(stateFor('licensed'), 300)
  },
  deactivate: () => delay(stateFor('trial_expired'), 300),
  openPurchasePage: async () => {},
}
