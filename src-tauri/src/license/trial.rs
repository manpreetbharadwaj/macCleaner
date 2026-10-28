//! 48-hour trial anchor: when it started, and the latest wall-clock time
//! this app has ever observed (used to catch a rolled-back system clock).
//!
//! Signed with an HMAC key compiled into the binary. This is obfuscation
//! against a casual edit via Keychain Access.app or the `security` CLI, not
//! real security — anyone willing to disassemble the binary can recover the
//! key and forge a signature. The goal stated by the spec is detecting
//! *obvious* tampering without device fingerprinting, not building DRM; this
//! is the same honesty standard the rest of this codebase uses elsewhere
//! (e.g. GPU usage is reported as "Not available" rather than guessed).

use super::config::CLOCK_ROLLBACK_TOLERANCE_MS;
use super::keychain;
use super::shared_anchor;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[cfg(not(feature = "demo_identity"))]
const SERVICE: &str = "com.macbookcleaner.app.trial";
#[cfg(feature = "demo_identity")]
const SERVICE: &str = "com.macbookcleaner.app.demo.trial";
const ACCOUNT: &str = "anchor";

/// Not a secret in the cryptographic sense (see module doc) — just needs to
/// not be the sort of value someone would stumble onto while poking at the
/// Keychain item with a text editor.
const TRIAL_HMAC_KEY: &[u8] = &[
    0x20, 0x79, 0xb2, 0xef, 0xba, 0xaf, 0x2a, 0x2e, 0x4e, 0x5a, 0x0a, 0xc0, 0x7e, 0xe9, 0xfb, 0x6a, 0x33, 0xda, 0x25, 0x0d, 0xde, 0x56, 0xac, 0x2b, 0x58, 0xbc,
    0xec, 0x03, 0xdf, 0x9b, 0xc5, 0x28,
];

#[derive(Serialize, Deserialize, Clone, Debug)]
struct StoredAnchor {
    started_at_ms: u64,
    last_seen_at_ms: u64,
    sig: String,
}

pub struct Anchor {
    pub started_at_ms: u64,
    pub tamper_detected: bool,
}

fn sign(started_at_ms: u64, last_seen_at_ms: u64) -> String {
    let mut mac = HmacSha256::new_from_slice(TRIAL_HMAC_KEY).expect("HMAC accepts a key of any length");
    mac.update(format!("{started_at_ms}:{last_seen_at_ms}").as_bytes());
    format!("{:x}", mac.finalize().into_bytes())
}

/// Plain string comparison, not constant-time: this guards against a casual
/// edit of local Keychain data, not a network oracle, so there's no timing
/// side-channel worth defending against (see module doc).
fn verify(started_at_ms: u64, last_seen_at_ms: u64, sig: &str) -> bool {
    sign(started_at_ms, last_seen_at_ms) == sig
}

/// If `now` is behind the stored high-watermark by more than the tolerance,
/// the clock has very likely been turned back — freeze at the watermark
/// instead of trusting `now`. Pure and Keychain-free so it's directly
/// testable (see tests below).
fn clamp_rollback(stored_last_seen_at_ms: u64, now: u64) -> u64 {
    if (stored_last_seen_at_ms as i64) - (now as i64) > CLOCK_ROLLBACK_TOLERANCE_MS {
        stored_last_seen_at_ms
    } else {
        now
    }
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn anchor_bytes(started_at_ms: u64, last_seen_at_ms: u64) -> Vec<u8> {
    let anchor = StoredAnchor { started_at_ms, last_seen_at_ms, sig: sign(started_at_ms, last_seen_at_ms) };
    serde_json::to_vec(&anchor).expect("StoredAnchor always serializes")
}

fn save(started_at_ms: u64, last_seen_at_ms: u64) {
    if let Err(e) = keychain::write(SERVICE, ACCOUNT, &anchor_bytes(started_at_ms, last_seen_at_ms)) {
        log::error!("Could not persist the trial anchor to Keychain: {e}");
    }
}

/// What one anchor source (Keychain, or the machine-wide `/Users/Shared`
/// file) reports, after signature verification. `Invalid` is deliberately
/// distinct from `Missing`: a present-but-unparsable-or-unsigned record is
/// evidence of tampering, a simply-absent one is not (e.g. the shared
/// anchor hasn't been created yet on a Mac that predates this feature).
#[derive(Debug, PartialEq, Eq)]
enum Source {
    Valid { started_at_ms: u64, last_seen_at_ms: u64 },
    Missing,
    Invalid,
}

fn load_source(raw: Option<Vec<u8>>) -> Source {
    let Some(raw) = raw else {
        return Source::Missing;
    };
    let Ok(stored) = serde_json::from_slice::<StoredAnchor>(&raw) else {
        return Source::Invalid;
    };
    if !verify(stored.started_at_ms, stored.last_seen_at_ms, &stored.sig) {
        return Source::Invalid;
    }
    Source::Valid { started_at_ms: stored.started_at_ms, last_seen_at_ms: stored.last_seen_at_ms }
}

struct Reconciled {
    started_at_ms: u64,
    last_seen_at_ms: u64,
    effective_now: u64,
    /// True whenever *any* present source failed verification — surfaced
    /// to the UI for transparency even when the other source rescued a
    /// usable trial start (see `forced_expired`).
    tamper_detected: bool,
    /// True only when *no* source verified at all (both missing-with-one-
    /// invalid, or both invalid) — the original single-anchor fail-safe:
    /// treated as already expired, exactly as before this file existed.
    forced_expired: bool,
}

/// Combines whatever the Keychain anchor and the machine-wide
/// `/Users/Shared` anchor each say into one authoritative result for this
/// launch. Pure — no Keychain or filesystem access — so every interesting
/// combination is directly unit-testable (see tests below).
///
/// - If at least one source verifies, the authoritative `started_at_ms` is
///   the **earliest** of the verified sources, never the latest. This is
///   what stops a brand-new macOS user account (whose own Keychain anchor
///   is necessarily `Missing`) from ever buying extra trial time: it picks
///   up the machine-wide anchor's earlier value instead of starting fresh.
///   It's also what makes this self-healing — a source that's merely
///   `Missing` or stale relative to the other is never treated as evidence
///   of anything wrong, just recreated/caught up by the caller.
/// - `last_seen_at_ms` (used for clock-rollback detection) is the **latest**
///   of the verified sources, then clamped forward against `now` exactly as
///   before — using the latest of both sources, rather than just one,
///   means a rolled-back clock is caught even if only one of the two
///   anchors happened to record the more recent timestamp.
/// - Only when *no* source verifies at all does this fall back to the
///   original fail-safe behavior: `forced_expired` (started_at effectively
///   0, so the trial reads as already over) if a present record failed
///   verification, or a genuinely fresh trial (`now`) if both sources are
///   simply absent — the true first-launch-ever case.
fn reconcile(keychain: &Source, shared: &Source, now: u64) -> Reconciled {
    let mut candidates_started: Vec<u64> = Vec::new();
    let mut candidates_last_seen: Vec<u64> = Vec::new();
    let mut tamper_detected = false;

    for source in [keychain, shared] {
        match source {
            Source::Valid { started_at_ms, last_seen_at_ms } => {
                candidates_started.push(*started_at_ms);
                candidates_last_seen.push(*last_seen_at_ms);
            }
            Source::Invalid => tamper_detected = true,
            Source::Missing => {}
        }
    }

    if candidates_started.is_empty() {
        return if tamper_detected {
            Reconciled { started_at_ms: 0, last_seen_at_ms: now, effective_now: now, tamper_detected: true, forced_expired: true }
        } else {
            Reconciled { started_at_ms: now, last_seen_at_ms: now, effective_now: now, tamper_detected: false, forced_expired: false }
        };
    }

    let started_at_ms = candidates_started.into_iter().min().unwrap();
    let last_seen_floor = candidates_last_seen.into_iter().max().unwrap();
    let effective_now = clamp_rollback(last_seen_floor, now);
    let last_seen_at_ms = last_seen_floor.max(effective_now);
    Reconciled { started_at_ms, last_seen_at_ms, effective_now, tamper_detected, forced_expired: false }
}

/// Reads the trial anchor, creating one (= starting the trial) if this is
/// the first time this Mac has ever seen *either* anchor. Reconciles the
/// per-user Keychain anchor against the machine-wide `/Users/Shared`
/// anchor (see `shared_anchor` and `reconcile` above), then self-heals
/// whichever side is missing or stale — including seeding a not-yet-
/// created `/Users/Shared` anchor from an existing Keychain anchor's
/// *original* `started_at_ms`, never from `now`, so upgrading to this
/// version never resets an in-progress trial.
///
/// Writing the shared anchor is best-effort: if `/Users/Shared` is
/// unwritable for any reason, that failure is logged and otherwise
/// ignored — this function's contract is "work at least as well as
/// Keychain-only did before," never "require both writes to succeed."
pub fn load_or_start(now: u64) -> (Anchor, u64) {
    let keychain_source = load_source(keychain::read(SERVICE, ACCOUNT));
    let shared_path = shared_anchor::default_path();
    let shared_source = load_source(shared_anchor::read_raw(&shared_path));

    let r = reconcile(&keychain_source, &shared_source, now);

    if r.forced_expired {
        return (Anchor { started_at_ms: 0, tamper_detected: true }, r.effective_now);
    }

    if !matches!(keychain_source, Source::Valid { started_at_ms, last_seen_at_ms } if started_at_ms == r.started_at_ms && last_seen_at_ms == r.last_seen_at_ms) {
        save(r.started_at_ms, r.last_seen_at_ms);
    }
    if !matches!(shared_source, Source::Valid { started_at_ms, last_seen_at_ms } if started_at_ms == r.started_at_ms && last_seen_at_ms == r.last_seen_at_ms) {
        if let Err(e) = shared_anchor::write_raw(&shared_path, &anchor_bytes(r.started_at_ms, r.last_seen_at_ms)) {
            log::warn!("Could not persist the machine-wide trial anchor to {shared_path:?} (this Mac's own Keychain record still governs its trial): {e}");
        }
    }

    (Anchor { started_at_ms: r.started_at_ms, tamper_detected: r.tamper_detected }, r.effective_now)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sign_and_verify_round_trip() {
        let sig = sign(1000, 2000);
        assert!(verify(1000, 2000, &sig));
    }

    #[test]
    fn verify_rejects_a_different_payload_than_was_signed() {
        let sig = sign(1000, 2000);
        assert!(!verify(1000, 2001, &sig));
        assert!(!verify(1001, 2000, &sig));
    }

    #[test]
    fn verify_rejects_garbage_signatures() {
        assert!(!verify(1000, 2000, "not-hex"));
        assert!(!verify(1000, 2000, ""));
        assert!(!verify(1000, 2000, &sign(9999, 9999)));
    }

    #[test]
    fn clock_rollback_within_tolerance_is_not_flagged() {
        let stored_last_seen: u64 = 10_000_000;
        let jitter_back = stored_last_seen - (CLOCK_ROLLBACK_TOLERANCE_MS as u64 / 2);
        assert_eq!(clamp_rollback(stored_last_seen, jitter_back), jitter_back, "ordinary jitter within tolerance must pass `now` through unchanged");
    }

    #[test]
    fn clock_rollback_beyond_tolerance_freezes_the_effective_time() {
        let stored_last_seen: u64 = 10_000_000;
        let rolled_back_now: u64 = 1_000_000; // far enough back to exceed tolerance
        assert_eq!(
            clamp_rollback(stored_last_seen, rolled_back_now),
            stored_last_seen,
            "a rolled-back clock must never move the effective time backwards"
        );
    }

    #[test]
    fn ordinary_forward_time_passes_through_unchanged() {
        assert_eq!(clamp_rollback(10_000_000, 10_000_500), 10_000_500);
    }

    #[test]
    fn service_and_account_names_are_regression_guarded() {
        // Renaming either constant would silently reset every existing
        // user's trial on their next update (a fresh Keychain item with no
        // prior history) — see docs/trial-license-abuse-prevention.md,
        // Recommendation 3. A future rename must fail this test first.
        #[cfg(not(feature = "demo_identity"))]
        assert_eq!(SERVICE, "com.macbookcleaner.app.trial");
        #[cfg(feature = "demo_identity")]
        assert_eq!(SERVICE, "com.macbookcleaner.app.demo.trial");
        assert_eq!(ACCOUNT, "anchor");
    }

    #[test]
    fn demo_identity_and_production_identity_never_collide() {
        // The exact property that makes demo_identity safe: whichever one
        // this binary was built with, the demo and production Keychain
        // service names must never be equal — a collision here would mean
        // a demo build and the real production app silently share one
        // Keychain item, defeating the entire point of this feature.
        const PRODUCTION: &str = "com.macbookcleaner.app.trial";
        const DEMO: &str = "com.macbookcleaner.app.demo.trial";
        assert_ne!(PRODUCTION, DEMO);
        #[cfg(not(feature = "demo_identity"))]
        assert_eq!(SERVICE, PRODUCTION, "a non-demo build must use the production service name");
        #[cfg(feature = "demo_identity")]
        assert_eq!(SERVICE, DEMO, "a demo_identity build must use the demo service name, never the production one");
    }

    #[test]
    fn reconcile_both_missing_starts_a_fresh_trial_now() {
        let r = reconcile(&Source::Missing, &Source::Missing, 5_000);
        assert_eq!(r.started_at_ms, 5_000);
        assert_eq!(r.effective_now, 5_000);
        assert!(!r.tamper_detected);
        assert!(!r.forced_expired);
    }

    #[test]
    fn reconcile_keeps_the_keychain_value_when_shared_anchor_is_not_yet_created() {
        // The dominant real-world case right after this ships: every
        // existing single-user Mac already has a valid Keychain anchor and
        // no shared anchor yet. Must reproduce exactly what load_or_start
        // did before the shared anchor existed — no reset, no change.
        let keychain = Source::Valid { started_at_ms: 1_000, last_seen_at_ms: 1_000 };
        let r = reconcile(&keychain, &Source::Missing, 50_000);
        assert_eq!(r.started_at_ms, 1_000, "an existing user's trial start must not move just because the shared anchor doesn't exist yet");
        assert!(!r.tamper_detected);
        assert!(!r.forced_expired);
    }

    #[test]
    fn reconcile_keeps_the_shared_value_when_keychain_anchor_is_missing() {
        // The mirror case: Keychain item deleted (or a brand-new macOS user
        // account, which has never had its own Keychain item at all), but
        // the machine-wide anchor survives.
        let shared = Source::Valid { started_at_ms: 2_000, last_seen_at_ms: 2_000 };
        let r = reconcile(&Source::Missing, &shared, 50_000);
        assert_eq!(r.started_at_ms, 2_000);
        assert!(!r.tamper_detected);
        assert!(!r.forced_expired);
    }

    #[test]
    fn reconcile_picks_the_earlier_started_at_when_both_sources_disagree() {
        // The exact property that closes the "new macOS user account"
        // gap: whichever anchor is older always wins, so a fresh per-user
        // Keychain item can never out-rank an older machine-wide one.
        let keychain = Source::Valid { started_at_ms: 9_000, last_seen_at_ms: 9_000 };
        let shared = Source::Valid { started_at_ms: 1_000, last_seen_at_ms: 1_000 };
        let r = reconcile(&keychain, &shared, 50_000);
        assert_eq!(r.started_at_ms, 1_000);

        // Order must not matter.
        let r2 = reconcile(&shared, &keychain, 50_000);
        assert_eq!(r2.started_at_ms, 1_000);
    }

    #[test]
    fn reconcile_uses_the_later_last_seen_across_both_sources_for_rollback_clamping() {
        let keychain_watermark = 20_000_000u64;
        let shared_watermark = 1_000_000u64;
        let keychain = Source::Valid { started_at_ms: 1_000, last_seen_at_ms: keychain_watermark };
        let shared = Source::Valid { started_at_ms: 1_000, last_seen_at_ms: shared_watermark };
        // `now` is far enough behind the Keychain anchor's own high
        // watermark to exceed CLOCK_ROLLBACK_TOLERANCE_MS, but is actually
        // *ahead* of the shared anchor's watermark alone — using only the
        // shared anchor's value would wrongly miss the rollback. Using the
        // max across both sources must still catch it.
        let now = shared_watermark + 1_000;
        assert!((keychain_watermark as i64) - (now as i64) > CLOCK_ROLLBACK_TOLERANCE_MS);
        assert!((shared_watermark as i64) - (now as i64) <= CLOCK_ROLLBACK_TOLERANCE_MS);
        let r = reconcile(&keychain, &shared, now);
        assert_eq!(r.effective_now, keychain_watermark, "the higher-watermark source must still win the rollback check even if the other source alone wouldn't have caught it");
    }

    #[test]
    fn reconcile_rescues_the_trial_when_one_source_is_tampered_but_the_other_verifies() {
        // Self-healing: a corrupted/tampered single anchor must not brick
        // the trial when a validly-signed redundant anchor exists.
        let shared = Source::Valid { started_at_ms: 3_000, last_seen_at_ms: 3_000 };
        let r = reconcile(&Source::Invalid, &shared, 50_000);
        assert_eq!(r.started_at_ms, 3_000, "the valid source must rescue the trial start");
        assert!(r.tamper_detected, "tampering must still be surfaced for diagnostics");
        assert!(!r.forced_expired, "must not force expiry when a valid source exists to fall back on");
    }

    #[test]
    fn reconcile_forces_expiry_when_both_sources_are_invalid() {
        // Preserves the original single-anchor fail-safe behavior exactly:
        // no valid source anywhere means treated as already expired.
        let r = reconcile(&Source::Invalid, &Source::Invalid, 50_000);
        assert_eq!(r.started_at_ms, 0);
        assert!(r.tamper_detected);
        assert!(r.forced_expired);
    }

    #[test]
    fn reconcile_forces_expiry_when_the_only_present_source_is_invalid_and_the_other_is_missing() {
        // No rescue is possible when the other side was simply never
        // created — must still fail safe, not fall through to "fresh trial".
        let r = reconcile(&Source::Invalid, &Source::Missing, 50_000);
        assert_eq!(r.started_at_ms, 0);
        assert!(r.forced_expired);

        let r2 = reconcile(&Source::Missing, &Source::Invalid, 50_000);
        assert_eq!(r2.started_at_ms, 0);
        assert!(r2.forced_expired);
    }

    #[test]
    fn reconcile_is_idempotent_once_both_sources_agree() {
        // Once self-healing has run once and both anchors hold the same
        // reconciled value, re-reconciling must be a no-op (no further
        // drift, no spurious rewrites on every subsequent launch).
        let same = Source::Valid { started_at_ms: 7_000, last_seen_at_ms: 7_000 };
        let r = reconcile(&same, &same, 7_500);
        assert_eq!(r.started_at_ms, 7_000);
        assert_eq!(r.last_seen_at_ms, 7_500);
        assert!(!r.tamper_detected);
    }
}
