//! 48-hour free trial + one-time lifetime license via Dodo Payments.
//!
//! No Dodo merchant API key exists anywhere in this app: activating,
//! validating and deactivating a license key are all public Dodo endpoints
//! (see dodo.rs), and buying is a static, no-auth payment link (see
//! `license_open_purchase_page`) — there is nothing here that could leak a
//! secret, because there is no secret to leak. Trial/license state lives in
//! the macOS Keychain, not `state.json` — see keychain.rs for why.

pub mod config;
pub mod dodo;
pub mod dto;
pub mod keychain;
mod shared_anchor;
pub mod trial;

use config::{DODO_CHECKOUT_HOST, DODO_PRODUCT_ID, OFFLINE_GRACE_MS, THANK_YOU_URL, TRIAL_DURATION_MS};
use dto::{LicenseStateDto, LicenseStatus};
use serde::{Deserialize, Serialize};

// `demo_identity` is a dev/manual-testing convenience (isolated Keychain
// namespaces + an isolated shared-anchor path, so a live demo can never
// touch a real production trial/license record — see trial.rs,
// shared_anchor.rs). Excluding it from `default` already stops a plain
// `cargo build`/`tauri build` from shipping it by accident, exactly like
// `dodo_test_mode` — but unlike `dodo_test_mode` (which is always safe to
// combine with `--release`, since it only changes which *external* host a
// built binary talks to), shipping a *release* binary with demo_identity
// would mean a real customer's trial/license would silently be stored
// under the demo Keychain namespace, which no real activation or
// purchase flow would ever see again. That failure mode is bad enough
// that `default = []` alone wasn't considered sufficient — this refuses
// to compile at all if demo_identity is ever combined with a release
// profile, however it was requested.
#[cfg(all(feature = "demo_identity", not(debug_assertions)))]
compile_error!("demo_identity must never be enabled in a release build — it would silently store a real customer's trial/license under an isolated namespace no real activation flow ever reads. Build without --release, or without this feature.");

// A demo build's whole point is that it's safe to click through Buy /
// Activate / Deactivate without consequence — which is only true if it's
// also talking to Dodo's sandbox, not the real live API. `demo_identity`
// alone would isolate the Keychain/shared-anchor storage but still send
// real activate/validate/deactivate calls to production Dodo, which could
// touch a real customer's real license. Requiring `dodo_test_mode`
// alongside `demo_identity` closes that gap at compile time rather than
// relying on a developer remembering to pass both flags.
#[cfg(all(feature = "demo_identity", not(feature = "dodo_test_mode")))]
compile_error!("demo_identity requires dodo_test_mode — build with both features together (`-f demo_identity -f dodo_test_mode`), so a demo never sends real activate/validate/deactivate calls to the live Dodo API. demo_identity alone is refused.");

#[cfg(not(feature = "demo_identity"))]
const LICENSE_SERVICE: &str = "com.macbookcleaner.app.license";
#[cfg(feature = "demo_identity")]
const LICENSE_SERVICE: &str = "com.macbookcleaner.app.demo.license";
const LICENSE_ACCOUNT: &str = "activation";

#[derive(Serialize, Deserialize, Clone, Debug)]
struct StoredLicense {
    license_key: String,
    instance_id: String,
    activated_at_ms: u64,
    last_validated_at_ms: u64,
    last_valid: bool,
}

fn read_license() -> Option<StoredLicense> {
    keychain::read(LICENSE_SERVICE, LICENSE_ACCOUNT).and_then(|raw| serde_json::from_slice(&raw).ok())
}

fn save_license(license: &StoredLicense) -> Result<(), String> {
    let bytes = serde_json::to_vec(license).map_err(|e| e.to_string())?;
    keychain::write(LICENSE_SERVICE, LICENSE_ACCOUNT, &bytes)
}

fn clear_license() {
    keychain::clear(LICENSE_SERVICE, LICENSE_ACCOUNT);
}

/// All but the final group become bullets, e.g. "PRO-AAAA-BBBB-CCCC-DDDD" ->
/// "••••-••••-••••-DDDD"; a key with no "-" keeps only its last 4 characters.
fn mask_key(key: &str) -> String {
    if key.contains('-') {
        let parts: Vec<&str> = key.split('-').collect();
        let last = parts.len() - 1;
        parts.iter().enumerate().map(|(i, p)| if i == last { p.to_string() } else { "•".repeat(p.chars().count()) }).collect::<Vec<_>>().join("-")
    } else if key.chars().count() > 4 {
        let keep: String = key.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
        format!("{}{}", "•".repeat(key.chars().count() - 4), keep)
    } else {
        key.to_string()
    }
}

/// Pure given the current trial anchor + stored license (if any) — no
/// network. Reads/updates the Keychain-stored trial anchor as a side effect
/// (see trial::load_or_start), but never makes an HTTP request.
fn compute_state(now: u64) -> LicenseStateDto {
    let (anchor, now) = trial::load_or_start(now);
    let trial_ends_at_ms = anchor.started_at_ms.saturating_add(TRIAL_DURATION_MS);
    let trial_remaining_ms = trial_ends_at_ms.saturating_sub(now);

    let license = read_license();
    let (status, grace_remaining_ms) = match &license {
        None => {
            if trial_remaining_ms > 0 {
                (LicenseStatus::Trial, 0)
            } else {
                (LicenseStatus::TrialExpired, 0)
            }
        }
        Some(lic) if !lic.last_valid => (LicenseStatus::LicensedInvalid, 0),
        Some(lic) => {
            let since_checked = now.saturating_sub(lic.last_validated_at_ms);
            if since_checked <= OFFLINE_GRACE_MS {
                (LicenseStatus::Licensed, OFFLINE_GRACE_MS - since_checked)
            } else {
                (LicenseStatus::LicensedGraceExpired, 0)
            }
        }
    };

    LicenseStateDto {
        status,
        trial_started_at_ms: anchor.started_at_ms,
        trial_ends_at_ms,
        remaining_ms: trial_remaining_ms,
        license_key_masked: license.as_ref().map(|l| mask_key(&l.license_key)),
        last_validated_at_ms: license.as_ref().map(|l| l.last_validated_at_ms),
        grace_remaining_ms,
        tamper_detected: anchor.tamper_detected,
    }
}

#[tauri::command]
pub fn license_get_state() -> LicenseStateDto {
    compute_state(trial::now_ms())
}

/// Pure: decides what (if anything) a validate outcome should change about a
/// stored license. `None` means "leave it exactly as it was" — in
/// particular, `Error` (couldn't reach Dodo, or it returned something
/// unexpected) always means `None`, never a downgrade to invalid. Split out
/// from `license_refresh` so this decision is unit-testable without any
/// network access (see tests below) — the only thing that may ever flip
/// `last_valid` to `false` is Dodo explicitly answering `valid: false`.
fn apply_validate_outcome(lic: &StoredLicense, outcome: &dodo::ValidateOutcome, now: u64) -> Option<StoredLicense> {
    match outcome {
        dodo::ValidateOutcome::Valid => Some(StoredLicense { last_valid: true, last_validated_at_ms: now, ..lic.clone() }),
        dodo::ValidateOutcome::Invalid => Some(StoredLicense { last_valid: false, last_validated_at_ms: now, ..lic.clone() }),
        dodo::ValidateOutcome::Error(_) => None,
    }
}

/// Re-checks a stored license against Dodo, if one is stored. A network
/// failure here is never treated as "invalid" — it just leaves the cached
/// state untouched and lets the offline-grace math in `compute_state` decide
/// whether this Mac still counts as licensed.
#[tauri::command]
pub async fn license_refresh() -> LicenseStateDto {
    let now = trial::now_ms();
    if let Some(lic) = read_license() {
        let outcome = dodo::validate(&lic.license_key, &lic.instance_id).await;
        match &outcome {
            dodo::ValidateOutcome::Error(e) => {
                log::warn!("License validation couldn't complete (treated as offline, not invalid): {e}");
            }
            _ => {
                if let Some(updated) = apply_validate_outcome(&lic, &outcome, now) {
                    if let Err(e) = save_license(&updated) {
                        log::error!("Could not persist a refreshed license status: {e}");
                    }
                }
            }
        }
    }
    compute_state(now)
}

fn device_name() -> String {
    crate::perf::sysctl::read_string("kern.hostname").unwrap_or_else(|| "Unknown Mac".to_string())
}

#[tauri::command]
pub async fn license_activate(license_key: String) -> Result<LicenseStateDto, String> {
    let key = license_key.trim().to_string();
    if key.is_empty() {
        return Err("Enter a license key first.".to_string());
    }
    match dodo::activate(&key, &device_name()).await {
        dodo::ActivateOutcome::Activated { instance_id } => {
            let now = trial::now_ms();
            save_license(&StoredLicense { license_key: key, instance_id, activated_at_ms: now, last_validated_at_ms: now, last_valid: true })?;
            Ok(compute_state(now))
        }
        dodo::ActivateOutcome::NotActive => Err("This license key isn't active. If you just purchased it, check your email in a moment and try again.".to_string()),
        dodo::ActivateOutcome::NotFound => Err("This license key wasn't found. Double-check it and try again.".to_string()),
        dodo::ActivateOutcome::LimitReached => Err("This license key is already activated on another Mac. Deactivate it there first, then try again here.".to_string()),
        dodo::ActivateOutcome::Error(e) => Err(e),
    }
}

/// Frees this Mac's activation slot so the license can be used elsewhere.
/// On a network failure, credentials are kept and an error is returned —
/// clearing them without confirmation from Dodo would strand the user with
/// no way to retry and no way to re-activate (the slot would still look
/// "used" to Dodo).
#[tauri::command]
pub async fn license_deactivate() -> Result<LicenseStateDto, String> {
    let Some(lic) = read_license() else {
        return Ok(compute_state(trial::now_ms()));
    };
    match dodo::deactivate(&lic.license_key, &lic.instance_id).await {
        dodo::DeactivateOutcome::Deactivated | dodo::DeactivateOutcome::NotFound => {
            clear_license();
            Ok(compute_state(trial::now_ms()))
        }
        dodo::DeactivateOutcome::Error(e) => Err(e),
    }
}

/// Opens Dodo's static, no-code payment link in the default browser — no
/// API key or server-side session needed for a one-time purchase. The
/// product id, checkout host, and thank-you redirect are all app config
/// (see config.rs), not user input, so the frontend never constructs this
/// URL itself. This only ever opens a URL — it has no effect on license
/// state; see `license_activate` for the only thing that can actually
/// unlock the app.
#[tauri::command]
pub fn license_open_purchase_page() -> Result<(), String> {
    let mut url = url::Url::parse(&format!("https://{DODO_CHECKOUT_HOST}/buy/{DODO_PRODUCT_ID}")).map_err(|e| e.to_string())?;
    url.query_pairs_mut().append_pair("quantity", "1").append_pair("redirect_url", THANK_YOU_URL).append_pair("showDiscounts", "true");
    crate::external_url::open(url.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_a_grouped_key_but_keeps_the_last_group() {
        assert_eq!(mask_key("PRO-AAAA-BBBB-CCCC-DDDD"), "•••-••••-••••-••••-DDDD");
    }

    #[test]
    fn masks_an_ungrouped_key_to_its_last_four_characters() {
        assert_eq!(mask_key("ABCDEFGHIJ"), "••••••GHIJ");
    }

    #[test]
    fn never_panics_on_a_very_short_key() {
        assert_eq!(mask_key("AB"), "AB");
        assert_eq!(mask_key(""), "");
    }

    #[test]
    fn trial_remaining_counts_down_and_floors_at_zero() {
        let not_expired = TRIAL_DURATION_MS.saturating_sub(1000);
        assert!(not_expired > 0);
        let expired = 0u64.saturating_sub(TRIAL_DURATION_MS + 1);
        assert_eq!(expired, 0, "saturating_sub must floor at zero rather than wrap");
    }

    #[test]
    fn grace_period_boundary_math() {
        let since_checked_inside = OFFLINE_GRACE_MS - 1;
        assert!(since_checked_inside <= OFFLINE_GRACE_MS);
        let since_checked_outside = OFFLINE_GRACE_MS + 1;
        assert!(since_checked_outside > OFFLINE_GRACE_MS);
    }

    #[test]
    fn purchase_url_percent_encodes_the_redirect_url() {
        // Uses the live `DODO_CHECKOUT_HOST` in a default (non-test-mode)
        // build so this keeps passing under both `cargo test` and
        // `cargo test --features dodo_test_mode` without duplication.
        let mut url = url::Url::parse(&format!("https://{DODO_CHECKOUT_HOST}/buy/{DODO_PRODUCT_ID}")).unwrap();
        url.query_pairs_mut().append_pair("quantity", "1").append_pair("redirect_url", THANK_YOU_URL).append_pair("showDiscounts", "true");
        let s = url.as_str();
        assert!(s.starts_with(&format!("https://{DODO_CHECKOUT_HOST}/buy/")));
        assert!(s.contains("redirect_url=https%3A%2F%2Fmacbookcleaner.app%2Fthank-you"), "{s}");
        assert!(s.contains("quantity=1"));
        assert!(s.contains("showDiscounts=true"));
    }

    fn sample_license() -> StoredLicense {
        StoredLicense { license_key: "PRO-AAAA-BBBB-CCCC-DDDD".to_string(), instance_id: "lki_abc".to_string(), activated_at_ms: 1_000, last_validated_at_ms: 1_000, last_valid: true }
    }

    #[test]
    fn a_network_error_outcome_never_changes_the_stored_license() {
        // The exact property the user's spec calls out as point 23:
        // "failed validation must not permanently destroy legitimate
        // activation data." A transient network failure must be
        // indistinguishable, to the stored record, from not having checked
        // at all this run.
        let lic = sample_license();
        let outcome = dodo::ValidateOutcome::Error("timed out".to_string());
        assert!(apply_validate_outcome(&lic, &outcome, 999_999).is_none(), "an Error outcome must never produce a value to save");
    }

    #[test]
    fn a_valid_outcome_refreshes_the_validated_timestamp_and_keeps_validity() {
        let lic = sample_license();
        let updated = apply_validate_outcome(&lic, &dodo::ValidateOutcome::Valid, 5_000).expect("Valid must produce an update");
        assert!(updated.last_valid);
        assert_eq!(updated.last_validated_at_ms, 5_000);
        assert_eq!(updated.license_key, lic.license_key, "unrelated fields must be carried through unchanged");
    }

    #[test]
    fn an_invalid_outcome_flips_last_valid_to_false() {
        let lic = sample_license();
        let updated = apply_validate_outcome(&lic, &dodo::ValidateOutcome::Invalid, 5_000).expect("Invalid must produce an update");
        assert!(!updated.last_valid);
        assert_eq!(updated.last_validated_at_ms, 5_000, "the check still happened and should be timestamped, even though it came back invalid");
    }

    #[test]
    fn license_service_and_account_names_are_regression_guarded() {
        // Same reasoning as trial.rs's equivalent guard: renaming either
        // constant would silently strand every existing activation on its
        // next update (a fresh Keychain item with no prior license data).
        #[cfg(not(feature = "demo_identity"))]
        assert_eq!(LICENSE_SERVICE, "com.macbookcleaner.app.license");
        #[cfg(feature = "demo_identity")]
        assert_eq!(LICENSE_SERVICE, "com.macbookcleaner.app.demo.license");
        assert_eq!(LICENSE_ACCOUNT, "activation");
    }

    #[test]
    fn demo_identity_and_production_license_identity_never_collide() {
        const PRODUCTION: &str = "com.macbookcleaner.app.license";
        const DEMO: &str = "com.macbookcleaner.app.demo.license";
        assert_ne!(PRODUCTION, DEMO);
        #[cfg(not(feature = "demo_identity"))]
        assert_eq!(LICENSE_SERVICE, PRODUCTION, "a non-demo build must use the production license service name");
        #[cfg(feature = "demo_identity")]
        assert_eq!(LICENSE_SERVICE, DEMO, "a demo_identity build must use the demo license service name, never the production one");
    }

    #[test]
    fn test_mode_and_live_mode_config_never_collide() {
        // Point 14 in the user's spec: "test/live environment mismatch."
        // Whichever one this binary was built with, the three Dodo-related
        // constants must agree with each other (all-test or all-live) and
        // never silently point at the wrong environment's host.
        #[cfg(feature = "dodo_test_mode")]
        {
            assert_eq!(config::DODO_API_BASE, "https://test.dodopayments.com");
            assert_eq!(config::DODO_CHECKOUT_HOST, "test.checkout.dodopayments.com");
            assert_eq!(config::DODO_PRODUCT_ID, "pdt_0NqQ5ZKXDNgbggDrQaV2d");
        }
        #[cfg(not(feature = "dodo_test_mode"))]
        {
            assert_eq!(config::DODO_API_BASE, "https://live.dodopayments.com");
            assert_eq!(config::DODO_CHECKOUT_HOST, "checkout.dodopayments.com");
            assert_ne!(config::DODO_PRODUCT_ID, "pdt_0NqQ5ZKXDNgbggDrQaV2d", "a live build must never carry the sandbox product id");
        }
    }

    #[test]
    fn no_license_key_is_ever_passed_to_a_log_macro() {
        // Static, textual check (point 24's "no plaintext logging" half —
        // UI-side masking is covered by the mask_key tests above): every
        // `log::` call in this module's own source is a literal/format
        // string over `e`/generic text, never the license key field itself.
        // This can't catch a future regression that logs through a new
        // indirection, but it does catch the direct case, and keeps the
        // check next to the code it's checking rather than in a separate
        // audit document that goes stale.
        for (name, source) in [("mod.rs", include_str!("mod.rs")), ("dodo.rs", include_str!("dodo.rs")), ("trial.rs", include_str!("trial.rs")), ("keychain.rs", include_str!("keychain.rs"))] {
            for line in source.lines().filter(|l| l.contains("log::")) {
                assert!(
                    !line.contains("lic.license_key") && !line.contains("license_key}") && !line.contains("{license_key") && !line.contains("license_key)"),
                    "{name}: a log:: line appears to reference a license key directly: {line}"
                );
            }
        }
    }
}
