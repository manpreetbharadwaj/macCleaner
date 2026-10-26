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
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

const SERVICE: &str = "com.macbookcleaner.app.trial";
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

fn save(started_at_ms: u64, last_seen_at_ms: u64) {
    let anchor = StoredAnchor { started_at_ms, last_seen_at_ms, sig: sign(started_at_ms, last_seen_at_ms) };
    if let Ok(bytes) = serde_json::to_vec(&anchor) {
        if let Err(e) = keychain::write(SERVICE, ACCOUNT, &bytes) {
            log::error!("Could not persist the trial anchor to Keychain: {e}");
        }
    }
}

/// Reads the trial anchor, creating one (= starting the trial) if this is
/// the first time this Mac has ever seen this Keychain item. Always
/// re-persists `last_seen_at_ms` as `max(stored, now)` — the clock-rollback
/// defense: a `now` that's behind the stored high-watermark by more than
/// `CLOCK_ROLLBACK_TOLERANCE_MS` never moves `last_seen_at_ms` backwards, so
/// turning the system clock back can never buy additional trial time. The
/// value handed back to the caller for "now" is the same clamped value, so
/// remaining-time math downstream automatically sees the frozen reading.
pub fn load_or_start(now: u64) -> (Anchor, u64) {
    let Some(raw) = keychain::read(SERVICE, ACCOUNT) else {
        // First launch ever on this Mac (or the first launch since this
        // Keychain item was last cleared) — start the trial now.
        save(now, now);
        return (Anchor { started_at_ms: now, tamper_detected: false }, now);
    };

    let Ok(stored) = serde_json::from_slice::<StoredAnchor>(&raw) else {
        // Present but unparsable — treat as tampered, fail safe (expired),
        // but don't destroy it; a future version might read it differently.
        return (Anchor { started_at_ms: 0, tamper_detected: true }, now);
    };

    if !verify(stored.started_at_ms, stored.last_seen_at_ms, &stored.sig) {
        return (Anchor { started_at_ms: 0, tamper_detected: true }, now);
    }

    let effective_now = clamp_rollback(stored.last_seen_at_ms, now);
    let last_seen_at_ms = stored.last_seen_at_ms.max(effective_now);
    if last_seen_at_ms != stored.last_seen_at_ms {
        save(stored.started_at_ms, last_seen_at_ms);
    }
    (Anchor { started_at_ms: stored.started_at_ms, tamper_detected: false }, effective_now)
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
}
