/** Mirrors src-tauri/src/license/dto.rs's `LicenseStatus` — keep both in sync. */
export type LicenseStatus = 'trial' | 'trial_expired' | 'licensed' | 'licensed_invalid' | 'licensed_grace_expired'

/** Mirrors src-tauri/src/license/dto.rs's `LicenseStateDto` — keep both in sync. */
export interface LicenseState {
  status: LicenseStatus
  trialStartedAtMs: number
  trialEndsAtMs: number
  remainingMs: number
  licenseKeyMasked: string | null
  lastValidatedAtMs: number | null
  graceRemainingMs: number
  tamperDetected: boolean
}

/** True for the states that must show the full-screen paywall. */
export function isLocked(status: LicenseStatus): boolean {
  return status === 'trial_expired' || status === 'licensed_invalid' || status === 'licensed_grace_expired'
}
