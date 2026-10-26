//! Placeholders the merchant (not this code) must fill in before shipping.
//! See the project's licensing setup notes for the exact Dodo dashboard
//! steps: create a $14.99 one-time product, enable the License Keys
//! entitlement with email fulfillment, and turn on Adaptive Currency in
//! Business Settings (Adaptive Currency is a dashboard toggle — there is
//! nothing for this app's code to call for it).
//!
//! Test mode vs. live mode is a **build-time** choice (the `dodo_test_mode`
//! Cargo feature, off by default — see `Cargo.toml`'s `[features]`), not
//! something detected at runtime from a license key: Dodo's own docs say a
//! key's mode can't be told apart from the string itself, and a key only
//! ever authenticates against the host it belongs to anyway. Build normally
//! (`cargo build`) for a real, shippable binary that only ever talks to live
//! endpoints; build with `--features dodo_test_mode` for a sandbox build
//! that only ever talks to test endpoints. The two never mix within one
//! binary. Never used for secret requests either way —
//! `/licenses/activate|validate|deactivate` are all public endpoints; no API
//! key is sent or stored anywhere in this app.

#[cfg(feature = "dodo_test_mode")]
pub const DODO_API_BASE: &str = "https://test.dodopayments.com";
#[cfg(not(feature = "dodo_test_mode"))]
pub const DODO_API_BASE: &str = "https://live.dodopayments.com";

/// Host for the static, no-code "Buy Lifetime License" payment link — a
/// different host than the API itself, confirmed from a real Dodo dashboard
/// "Share" link rather than guessed (Dodo's docs don't spell out the
/// test-mode checkout host).
#[cfg(feature = "dodo_test_mode")]
pub const DODO_CHECKOUT_HOST: &str = "test.checkout.dodopayments.com";
#[cfg(not(feature = "dodo_test_mode"))]
pub const DODO_CHECKOUT_HOST: &str = "checkout.dodopayments.com";

/// From the Dodo dashboard. The test-mode value is a real sandbox product
/// (Automatic fulfillment, no expiry, activation limit 1, one-time payment);
/// the live value is a placeholder until the real $14.99 product exists.
#[cfg(feature = "dodo_test_mode")]
pub const DODO_PRODUCT_ID: &str = "pdt_0NqQ5ZKXDNgbggDrQaV2d";
#[cfg(not(feature = "dodo_test_mode"))]
pub const DODO_PRODUCT_ID: &str = "pdt_REPLACE_WITH_YOUR_PRODUCT_ID";

/// Where Dodo sends the customer after a successful payment. Must be a page
/// that reads `license_key`/`payment_id`/`status`/`email` from its query
/// string and shows the customer their key — see web/src/pages/ThankYou.tsx.
pub const THANK_YOU_URL: &str = "https://macbookcleaner.app/thank-you";

/// 48 hours.
pub const TRIAL_DURATION_MS: u64 = 172_800_000;

/// How long a previously-activated license keeps working without a
/// successful online re-check before this app locks itself again. Generous
/// on purpose: a paying customer losing access because they were offline for
/// a day is a worse outcome than a revoked license staying unlocked for a
/// couple of extra weeks.
pub const OFFLINE_GRACE_MS: u64 = 14 * 24 * 60 * 60 * 1000;

/// Tolerance for ordinary clock jitter (timezone changes, NTP correction)
/// before a backwards jump in wall-clock time is treated as a rollback
/// attempt — see trial.rs.
pub const CLOCK_ROLLBACK_TOLERANCE_MS: i64 = 2 * 60 * 60 * 1000;
