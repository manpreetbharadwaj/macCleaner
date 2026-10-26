//! Typed payloads for the trial/license system. Mirrored in
//! src/features/license/types.ts — keep both in sync.

use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LicenseStatus {
    Trial,
    TrialExpired,
    Licensed,
    /// Licensed, but the last online check said the key is no longer valid
    /// (revoked, refunded, disabled) — locked, credentials kept in case the
    /// merchant re-enables the key.
    LicensedInvalid,
    /// Licensed and was valid as of the last online check, but that check is
    /// older than the offline grace period and a fresh one hasn't succeeded.
    LicensedGraceExpired,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStateDto {
    pub status: LicenseStatus,
    pub trial_started_at_ms: u64,
    pub trial_ends_at_ms: u64,
    /// 0 once the trial has ended.
    pub remaining_ms: u64,
    /// e.g. "••••-••••-••••-DDDD" — present only once a license is activated.
    pub license_key_masked: Option<String>,
    pub last_validated_at_ms: Option<u64>,
    /// 0 once the grace period has run out.
    pub grace_remaining_ms: u64,
    /// The stored trial anchor's signature didn't check out — treated as
    /// expired rather than trusted; surfaced so the UI can say why.
    pub tamper_detected: bool,
}
