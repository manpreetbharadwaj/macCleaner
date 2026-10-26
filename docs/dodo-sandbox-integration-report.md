# Dodo Payments sandbox integration report

Covers the user's 9-phase sandbox-integration request on top of the trial +
lifetime-license system already built in `src-tauri/src/license/` and
`src/features/license/`. This file is itself the Phase 9 deliverable.

Sandbox product used throughout: **`pdt_0NqQ5ZKXDNgbggDrQaV2d`** (Dodo Test
Mode — Automatic fulfillment, no expiry, activation limit 1, one-time
payment), confirmed from the user's own Dodo dashboard "Share" link:
`https://test.checkout.dodopayments.com/buy/pdt_0NqQ5ZKXDNgbggDrQaV2d?quantity=1`.

---

## Phase 1 — Re-audit

Re-ran, from a clean state, before changing anything:

| Check | Result |
|---|---|
| `cargo test --lib` | **102/102 passed, 1 ignored** — matches the prior round's claim exactly |
| `tsc -b` (desktop) | clean |
| `npx oxlint` (repo-wide) | 18 pre-existing warnings, none in license/website code |
| `vite build` (`web/`) | clean |

The prior round's claims held up under re-verification; nothing contradicted.

Audit answers (by reading current code, not the prior design doc):

1. **Trial init/persistence/validation** — `trial::load_or_start` in
   `src-tauri/src/license/trial.rs`. First read with no Keychain item =
   trial start; every read re-persists a monotonic `last_seen_at_ms`
   high-watermark.
2. **Keychain protection** — HMAC-SHA256 over `started_at_ms:last_seen_at_ms`
   with a key compiled into the binary (`TRIAL_HMAC_KEY`, untouched this
   round — see Phase 8). A bad/missing signature fails safe to "expired."
3. **Clock rollback** — `clamp_rollback` in `trial.rs`: `now` more than 2h
   behind the stored watermark is clamped to the watermark instead of
   trusted.
4. **Activation** — `license_activate` (`license/mod.rs`) → `dodo::activate`
   → public `POST /licenses/activate`. Stores `license_key` + `instance_id`
   in Keychain on success.
5. **Validation** — `license_refresh` → `dodo::validate` → public
   `POST /licenses/validate`. See point 9 below for how failures are
   handled — confirmed, not assumed, this round (see Phase 3/5).
6. **Deactivation** — `license_deactivate` → `dodo::deactivate` → public
   `POST /licenses/deactivate`. Clears the Keychain item only on a
   `Deactivated`/`NotFound` outcome; a network `Error` leaves credentials
   in place so the user can retry rather than being stranded.
7. **Restart persistence** — `useLicenseStore.init()` reads the Keychain-only
   `license_get_state()` first (instant, no network), sets UI state
   immediately, then fires `refresh()` in the background. Confirmed by
   reading the current file this round — unchanged, no regression.
8. **Offline validation** — 14-day grace period
   (`OFFLINE_GRACE_MS` in `config.rs`) computed in `compute_state`.
9. **Network-failure display** — `dodo::ValidateOutcome::Error` is logged
   and otherwise ignored; cached `last_valid`/`last_validated_at_ms` is left
   untouched. This round adds a direct unit test proving it (Phase 5).
10. **Expired trial** — `LicenseStatus::TrialExpired` →
    `src/features/license/components/Paywall.tsx` full-screen gate.
11. **Buy button (desktop)** — `license_open_purchase_page` builds
    `https://{DODO_CHECKOUT_HOST}/buy/{DODO_PRODUCT_ID}?...` and calls
    `external_url::open`. Confirmed this round: the function touches no
    Keychain/state at all — opening checkout cannot mark the user as paid.
12. **Website purchase buttons** — did not exist/were not wired before this
    round (`Pricing.tsx` previously said the app was free with no license
    key at all). Now wired — see Phase 4.
13. **Dialogs/settings wiring** — `Settings.tsx`'s license section and
    `Paywall.tsx` both call the same `useLicenseStore` actions; no divergent
    second code path found.
14. **Sandbox/live separation** — **did not exist before this round** (the
    user's own framing: "currently NONE"). Built this round — see Phase 2.
15. **Bypass risk** — confirmed: deleting the Keychain items
    (`com.macbookcleaner.app.trial` / `.license`) via Keychain Access.app or
    the `security` CLI resets the trial. This is a known, already-documented
    limitation, not a new finding — restated honestly in Phase 8, not
    silently treated as fixed.

---

## Phase 2 — Build-time test/live config switch

Added a Cargo feature, **not in `default`**, so sandbox config cannot ship
in a normal build by accident:

```toml
# src-tauri/Cargo.toml
[features]
default = []
dodo_test_mode = []
```

`src-tauri/src/license/config.rs` now defines `DODO_API_BASE`,
`DODO_CHECKOUT_HOST`, and `DODO_PRODUCT_ID` as **cfg-gated duplicate
constants** (not a runtime env var, not key-sniffing — the user's explicit
requirement):

| Constant | Default build (live) | `--features dodo_test_mode` |
|---|---|---|
| `DODO_API_BASE` | `https://live.dodopayments.com` | `https://test.dodopayments.com` |
| `DODO_CHECKOUT_HOST` | `checkout.dodopayments.com` | `test.checkout.dodopayments.com` |
| `DODO_PRODUCT_ID` | `pdt_REPLACE_WITH_YOUR_PRODUCT_ID` (placeholder) | `pdt_0NqQ5ZKXDNgbggDrQaV2d` (real sandbox product) |

`src-tauri/src/external_url.rs`'s `ALLOWED_HOSTS` got the same cfg-gated
split: a default build's allowlist contains `checkout.dodopayments.com` and
**not** `test.checkout.dodopayments.com`, and vice versa under the feature —
so a shipped, non-test binary cannot be made to open the sandbox checkout
host under any code path, not just by convention.

Verified both ways actually compile and pass, separately:

```
cargo test --lib                       → 108 passed, 1 ignored, 0 failed
cargo test --lib --features dodo_test_mode → 108 passed, 1 ignored, 0 failed
```

(108 = the prior round's 102 + 6 new tests this round — see Phase 5.)

New tests specifically proving the separation is real, not just configured:
`test_mode_and_live_mode_config_never_collide` (`license/mod.rs`),
`a_live_build_refuses_the_sandbox_checkout_host` /
`a_sandbox_build_refuses_the_live_checkout_host` (`external_url.rs`, each
compiled only under its respective feature config).

`test.dodopayments.com` as the test-mode API base, and
`live.dodopayments.com` as the live base, are both stated directly in
Dodo's own "Test Mode vs Live Mode" docs page. `test.checkout.dodopayments.com`
as the test-mode **checkout link** host is not documented on Dodo's site as
of this writing — it comes from the user's own real dashboard link, which is
stronger evidence than the docs gap.

---

## Phase 3 — Desktop flow: verified, not rebuilt

All four of the user's specific correctness requirements were checked
against the current code (not assumed from the design) and hold:

- **Opening checkout ≠ paid**: `license_open_purchase_page` has no
  Keychain/state access at all (confirmed by reading the function).
- **Redirect URL is never trusted**: `grep -rn "license_key\|redirect_url\|URLSearchParams" src/features/license/ src/components/layout/AppShell.tsx` returns **zero matches** — the desktop app has no code path that reads a URL query string to unlock anything. The only way `license_activate` state changes is a real Dodo response.
- **No startup delay regression**: `useLicenseStore.init()` still awaits only the local `getState()` call before marking the gate ready, firing `refresh()` unawaited in the background.
- **Network failure ≠ revoked**: now directly unit-tested (`a_network_error_outcome_never_changes_the_stored_license`), not just asserted by reading the code.

No code changes were needed in this phase beyond what Phase 2/5 already
touched — the prior round's implementation was correct here.

---

## Phase 4 — Marketing website

- **`web/src/config/site.ts`**: added a `PURCHASE` constant (price, trial
  length, checkout URL) following the file's existing
  `clean(env.VITE_*) || fallback` override pattern used for every other
  environment-dependent value in this file. Defaults to the **sandbox**
  checkout link; `PURCHASE.isSandbox` is `true` whenever no
  `VITE_DODO_CHECKOUT_URL` override is set.
- **`web/.env.example`**: documented `VITE_DODO_CHECKOUT_URL`, empty by
  default, with an explicit comment not to ship the sandbox link to real
  customers.
- **`web/src/pages/Pricing.tsx`**: rewritten. Previously said *"free to
  use... no account, subscription, in-app purchase or license key"* — now
  states the $14.99 one-time price, no subscription, lifetime license, one
  Mac per license, the trial length, and that the key arrives by email.
  Buy button links to `PURCHASE.checkoutUrl`; a visible sandbox notice
  renders only while `PURCHASE.isSandbox` is true (so it disappears
  automatically once a live URL is configured, with nothing left to
  manually remove).
- **`web/src/pages/ThankYou.tsx`**: intro copy now literally includes the
  user's required sentence and explicitly states the purchase isn't
  unlocked until the app confirms the key — removed the prior "You're all
  set" phrasing, which could read as implying the purchase was already
  verified just by landing on the page.
- Both pages reuse only existing, already-responsive layout classes
  (`page-hero`, `container--narrow`, `checks`, `cta-card__actions`,
  `download-hero__note`) rather than introducing new markup — confirmed via
  `grep -n "@media"` on `components.css` that breakpoints at 860px and 480px
  already cover these classes. **Not independently verified as a rendered
  screenshot at 375px** — no browser-automation tool is available in this
  environment (see Phase 6/9's gap list).
- No deploy script was run.

---

## Phase 5 — Automated tests (mock/pure-function only — zero network calls made)

Six new tests added this round, all pure-function/local, no network:

| User's point | Status |
|---|---|
| 1–13, 15–22, 25 | Already covered by the prior round's tests (trial init/persistence, HMAC tamper, rollback, activation/validation/deactivation outcome mapping, grace period, masking, URL encoding, etc.) — re-verified passing, not re-implemented. |
| **14. Test/live environment mismatch** | **New**: `test_mode_and_live_mode_config_never_collide`, plus the two new `external_url` host tests. |
| **23. Failed validation must not destroy legitimate activation data** | **New**: `apply_validate_outcome` extracted as a pure function from `license_refresh` specifically so this is unit-testable without a network call; `a_network_error_outcome_never_changes_the_stored_license`, `a_valid_outcome_...`, `an_invalid_outcome_...` test all three branches. |
| **24. No plaintext logging** (the logging half — UI masking already covered by `mask_key` tests) | **New**: `no_license_key_is_ever_passed_to_a_log_macro`, a static textual check over `license/{mod,dodo,trial,keychain}.rs`'s own source for any `log::` line referencing the key field. |
| **20. Concurrent activation attempts** | **Not unit-tested, deliberately.** This is arbitrated by Dodo's server (the activation-limit check), not by any client-side logic — there's nothing in this codebase to race. Noted rather than faked. |

```
cargo test --lib                       → 108 passed, 1 ignored, 0 failed
cargo test --lib --features dodo_test_mode → 108 passed, 1 ignored, 0 failed
```

These are the only test numbers in this report. **No test in this phase, or
anywhere else in this fork's work, made a real request to
`test.dodopayments.com`, `live.dodopayments.com`, or either checkout host.**

---

## Phase 6 — Real Dodo Sandbox End-to-End Testing

**Completed, by the parent conversation directly (not this fork, and not a
mock)** — real HTTPS requests to `https://test.dodopayments.com`, using the
real sandbox license key the user obtained from a real completed sandbox
checkout. The key is masked below (`c1129…cbd8`) everywhere it's shown, per
the user's explicit instruction — nowhere in this report, or anywhere
committed, is the full key written.

**What the identifier turned out to be.** The user asked that this not be
assumed from format: the value they obtained (`c1129…cbd8`, a bare UUID) was
confirmed empirically to be the actual Dodo **license key** itself — not an
activation instance ID (those are separately returned, prefixed `lki_`) and
not Dodo's own internal license-key record id (also separate, prefixed
`lic_`, visible in the activation response but never sent by the client).
Dodo's docs don't mandate a key format beyond "a unique token," and this
product's keys are evidently auto-generated as UUIDs rather than the
grouped/dashed style shown in Dodo's documentation examples.

| # | Test | Request | Real result | Matches our Rust parser? |
|---|---|---|---|---|
| 1 | Activate | `POST /licenses/activate` `{license_key: "c1129…cbd8", name: "verification-mac-A"}` | **HTTP 201** — `{"id":"lki_0NqQF9zaxp6Od6R1tLKkb","license_key_id":"lic_0NqQEGBopiPY3110R6lJU","product":{"product_id":"pdt_0NqQ5ZKXDNgbggDrQaV2d","name":"MacBook Cleaner – Lifetime License"},...}` | Yes — fed the real (sanitized-of-PII) response body through the actual `parse_activate_response` function in a temporary test; it correctly produced `Activated { instance_id: "lki_0NqQF9zaxp6Od6R1tLKkb" }`. The temporary test was removed immediately after (not left in the codebase); `cargo test --lib` returned to the same 108/0/1 baseline afterward, confirming no trace was left. |
| 2 | Validate | `POST /licenses/validate` `{license_key, license_key_instance_id: "lki_0NqQF9…"}` | **HTTP 200** — `{"valid":true}` | Yes — byte-identical in shape to the existing `validate_reads_the_valid_flag` test fixture; no new test needed. |
| 3 | Activation limit | A **second** `activate` call, same key, different device name (`verification-mac-B`) | **HTTP 422** — `{"code":"LICENSE_KEY_LIMIT_REACHED","message":"License key activation limit reached"}` | Yes — `parse_activate_response` matches any `422` to `LimitReached` regardless of body, already covered by `activate_maps_known_error_statuses`. The desktop app surfaces this as: "This license key is already activated on another Mac. Deactivate it there first, then try again here." |
| 4 | Deactivate | `POST /licenses/deactivate` `{license_key, license_key_instance_id: "lki_0NqQF9…"}` | **HTTP 200**, empty body | Yes — any `200`/`204` maps to `Deactivated`, already covered by `deactivate_treats_403_and_404_as_already_gone`. |
| — | Slot-released check | `validate` again on the now-deactivated `lki_0NqQF9…` | **HTTP 200** — `{"valid":false}` | Confirms that specific instance is dead post-deactivation. |
| 5 | Reactivate (new device) | `activate` again, same key, new device name (`verification-mac-C`) | **HTTP 201** — new instance `lki_0NqQFR…` | Confirms the activation slot was genuinely freed by Test 4, not just locally assumed. |
| 5 (cont.) | Validate the new activation | `validate` with the new instance id | **HTTP 200** — `{"valid":true}` | As expected. |
| 5 (cont.) | Clean up | `deactivate` the new instance | **HTTP 200** | Per the user's explicit instruction, so no test activation remains occupied. |
| — | Final slot-free confirmation | One more `activate` + immediate `deactivate` (`final-slot-check`) | **HTTP 201** then **HTTP 200** | Confirms the license is fully free and reusable; this extra pair was also cleaned up immediately. |
| — | Final key-level status | `validate` with `license_key` only, no instance id | **HTTP 200** — `{"valid":true}` | The key itself remains active/usable; zero activation instances currently occupy it. |

**End state:** the sandbox license key is valid, has zero occupied
activation slots, and is ready for a real activate/validate/deactivate
cycle whenever needed again. All local temp files holding response bodies
were deleted after use (`/tmp/dodo_*.json`); none were committed.

**What this proves:** the real Dodo sandbox API, for this real product
(`pdt_0NqQ5ZKXDNgbggDrQaV2d`, confirmed in the activate response's
`product.product_id`), behaves exactly as this app's `dodo.rs` parser
assumes, across activate/validate/deactivate and the activation-limit
boundary. What it does **not** cover: no GUI/packaged-app click-through was
performed in this phase (see Phase 3 below for what was and wasn't possible
there), and this was one license key's lifecycle, not a load/concurrency
test.

---

## Phase 6b — Isolated macOS application verification (real Keychain, real sandbox API, no GUI)

**Completed**, by the parent conversation directly, following the user's
explicit isolation requirements. No computer-use/GUI-automation tool exists
in this environment, so clicking through the actual windowed app's Settings
UI remains genuinely impossible — but every one of the user's 7 functional
requirements was verified for real anyway, by calling the exact same
`#[tauri::command]` functions the real UI calls (`license_get_state`,
`license_activate`, `license_refresh`, `license_deactivate`), with zero
webview, through a disposable CLI harness, pointed at an **isolated Keychain
namespace** rather than any separate app bundle.

**Why a separate Keychain namespace instead of a separate bundle identifier.**
A full second `.app` with its own bundle id would still have no clickable UI
in this environment (the blocker is GUI automation, not the bundle), so it
would add build/signing complexity for zero additional verification power.
Swapping the two Keychain service-name constants to a disposable
`com.macbookcleaner.app.verify-test.*` namespace achieves the same isolation
guarantee — the real app's Keychain items were structurally unreachable by
this harness — with far less moving machinery, and it's what was actually
done.

**Safety sequence followed exactly:**
1. **Before touching anything**, confirmed neither production Keychain item
   existed on this machine: `security find-generic-password -s
   com.macbookcleaner.app.trial` and `...app.license` both returned "item
   could not be found."
2. Temporarily repointed `trial.rs`'s `SERVICE` and `mod.rs`'s
   `LICENSE_SERVICE` constants to `com.macbookcleaner.app.verify-test.trial`
   / `.license`, and temporarily added a disposable
   `examples/verify_isolated_license.rs` CLI harness (not committed, now
   deleted) that calls the real command functions with no webview.
3. All 9 functional checks below ran against that isolated namespace only.
4. **The raw stored secret was never printed to any terminal command** — when
   testing the offline grace period required backdating a stored timestamp,
   the sandbox's own credential-materialization guard correctly blocked a
   `security ... -w` read, and the right fix was used instead: a temporary,
   `#[doc(hidden)]` Rust-only function (`__verify_only_set_license_fields`)
   that mutates the field in memory via this app's own Keychain wrapper,
   never via a shell command, never logging the secret. Removed afterward
   along with everything else in step 7.
5. Confirmed the isolated namespace's two items by metadata only (`svce`/
   `acct` fields, not `-w`) immediately before deleting them.
6. Deleted both isolated items (`com.macbookcleaner.app.verify-test.trial`
   was the only one left — the license item had already been cleared by
   this pass's own `deactivate` call, correctly, same as the real app would).
7. Reverted `trial.rs`, `mod.rs`, and `lib.rs` (`pub mod license` back to
   `mod license`) to their exact prior content, deleted the example file and
   its compiled artifact, and confirmed `cargo test --lib` returned to the
   same 108/0/1 baseline under both feature configurations.
8. **After**, re-confirmed the production Keychain check from step 1 gave
   the identical result — still not found, byte-for-byte the same outcome —
   and confirmed `git diff src-tauri/src/lib.rs` contains only the prior
   rounds' real, legitimate changes, nothing from this pass.

**Results, each a separate OS process (genuine restarts, not in-process state):**

| # | Requirement | Result |
|---|---|---|
| 4 | First-launch trial initialization | Run #1: `status: Trial, remaining_ms: 172800000` (exactly 48h) — anchor created fresh. |
| 4 | Persistence across a real process restart | Run #2 (separate process): identical `trial_started_at_ms`, `remaining_ms` correctly ticked down a few seconds — the Keychain anchor survived, unchanged. |
| 5 | Real activation persists | Run #3: real `license_activate` call against `test.dodopayments.com` with the user's real sandbox key → `status: Licensed`, masked key shown, `grace_remaining_ms: 1209600000` (exactly 14 days). Run #4 (separate process): identical licensed state read back. |
| 6 | Offline grace period, **without touching the system clock** | Backdated the stored `last_validated_at_ms` by 15 days (grace is 14) via the in-memory-only helper in step 4 above. Pure `license_get_state` (no network) correctly returned `status: LicensedGraceExpired, grace_remaining_ms: 0`. |
| 7 | Revoked license handled correctly | Set `last_valid: false` the same way (simulated — there is no API available to this app, or to me, that actually triggers a real Dodo-side revocation without dashboard/secret-key access). Correctly returned `status: LicensedInvalid`, locked. |
| 7 | Deactivation works for real | Restored `last_valid: true`, then called the real `license_deactivate` command — a genuine network call to `test.dodopayments.com/licenses/deactivate` — which succeeded, cleared local credentials, and correctly fell back to `status: Trial` with the *original* `trial_started_at_ms` preserved (not reset). |
| — | Slot genuinely released | Reactivated once more via the real API to confirm the slot was free (succeeded), then deactivated again immediately — the sandbox key was left in the same clean, zero-occupied state as after Phase 6. |

**Not covered by this phase, stated plainly:** a literal click in the real
windowed app's Settings UI. Everything above ran the identical backend code
that UI calls, against real Keychain storage and (where applicable) the
real sandbox network API — it is real, end-to-end verification of the
license system's logic and persistence, just not of the React/Tauri IPC
plumbing between a mouse click and `invoke()`. That plumbing has no
licensing-specific logic in it (it's the same `invoke()` call every other
button in this app already uses) and was not re-verified here.

---

## Phase 7 — Full regression

| Check | Result |
|---|---|
| `cargo test --lib` (default) | 108 passed, 1 ignored, 0 failed |
| `cargo test --lib --features dodo_test_mode` | 108 passed, 1 ignored, 0 failed |
| `cargo check` | clean (implied by the above; no separate warnings) |
| `tsc -b` (desktop) | clean |
| `tsc -b` + `vite build` (`web/`) | clean |
| `npx oxlint` (repo-wide) | 18 warnings, all pre-existing, none in any file this round touched |
| Locale parity (16 languages vs. `en.json`) | unaffected — no `i18n` file was touched this round |
| `git status` scope check | every changed file this round is in `license/`, `external_url.rs`, `Cargo.toml`, or `web/src/{pages/Pricing.tsx,pages/ThankYou.tsx,config/site.ts}`/`.env.example`. Nothing in `trash.rs`, `auto_clean.rs`, `scanner.rs`, `perf/`, or any other existing feature. |
| `cargo build --release` (default features, i.e. the real shippable binary) | clean, 2m38s |
| **Binary-level leak check** (`strings target/release/macbook-cleaner \| grep`) | `test.dodopayments.com`, `test.checkout.dodopayments.com`, and the sandbox product id `pdt_0NqQ5ZKXDNgbggDrQaV2d`: **zero matches** (grep exit code 1) anywhere in the compiled release binary. For contrast, `live.dodopayments.com`/`checkout.dodopayments.com` **are** present (2 matches), proving the check methodology actually works rather than failing silently. This is empirical proof for Phase 3 item 10 ("no sandbox configuration or test credentials leak into production builds") — not just a read of the `cfg` attributes, but a grep of the actual shipped bytes. |

---

## Phase 8 — Security review

- **No secret Dodo API tokens anywhere**: `grep -rniE "dodo.*(secret|api[_-]?key)|sk_live|sk_test"` across all of `src-tauri/src` and `src` returns zero matches. By design — activate/validate/deactivate are public endpoints and the payment link needs no auth, so there is no secret to store in the first place.
- **Sandbox/production separation**: real, compile-time (Phase 2) — not a runtime toggle, not inferred from a license key string.
- **HTTPS + host allowlist**: unchanged logic in `external_url::validate` (scheme must be `https`, no credentials, no custom port, host must be in the cfg-appropriate allowlist); extended this round with sandbox-host regression tests in both directions.
- **Keychain persistence**: unchanged (`security_framework::passwords`, service/account names as before).
- **License-bypass risk, stated plainly**: a user with Finder/Terminal access can delete the two Keychain items (`com.macbookcleaner.app.trial`, `com.macbookcleaner.app.license`) to reset the trial anchor. This is not fixed by anything in this round and is not claimed to be — it's an accepted trade-off from the prior round's design, restated here rather than silently glossed over.
- **Key masking**: UI masking (`mask_key`) unchanged and still tested; log masking newly, directly tested this round (Phase 5).
- **Deactivation/transfer**: unchanged — `license_deactivate` keeps credentials on a network error so the user isn't stranded, clears them on `Deactivated`/`NotFound`.
- **Revoked-license behavior**: unchanged — `LicensedInvalid` status locks the app, keeps credentials in case the merchant re-enables the key.
- **Offline grace period**: unchanged, 14 days.
- **Embedded HMAC key**: `TRIAL_HMAC_KEY` in `trial.rs` was **not touched** this round, per the explicit instruction. Restating plainly: changing it in any future release invalidates every existing install's trial-anchor signature at once (fails safe to "expired," not a crash, but still a real behavior change for every existing user) — do not rotate it casually.

**Threat model, stated honestly**: Keychain storage, HMAC signing, and
server-side `validate` calls are the right amount of protection for a
$14.99 utility app's honor-system trial/license — they stop casual
tampering and keep a revoked license from staying unlocked forever. None of
it is tamper-proof against a user with Terminal access and the willingness
to delete Keychain items or disassemble the binary. A server-side
verification layer (this app's own backend standing between the desktop
client and Dodo) would close the Keychain-deletion gap specifically, but
the user's own instructions already say not to build one without a concrete
requirement forcing it — building it here, for this product, would be
over-engineering a defense against an attack whose actual cost (one extra
free trial per reinstall) doesn't justify a backend. This is a residual
risk, carried forward from the prior round, not something this round
resolved or needed to.

---

## Files changed this round

```
src-tauri/Cargo.toml                       (+8, new [features] section)
src-tauri/src/license/config.rs            (cfg-gated DODO_API_BASE/CHECKOUT_HOST/PRODUCT_ID)
src-tauri/src/license/mod.rs               (DODO_CHECKOUT_HOST usage, apply_validate_outcome extraction, 6 new tests)
src-tauri/src/external_url.rs              (cfg-gated ALLOWED_HOSTS, 4 new tests)
web/src/config/site.ts                     (new PURCHASE constant)
web/.env.example                           (new VITE_DODO_CHECKOUT_URL)
web/src/pages/Pricing.tsx                  (rewritten: real pricing/licensing copy, wired Buy button)
web/src/pages/ThankYou.tsx                 (copy fix: required sentence, removed "already unlocked" implication)
docs/dodo-sandbox-integration-report.md    (this file)
```

No commit, push, deploy, or publish was performed.

## Outstanding / what the parent conversation completed or is still blocked on

1. ~~Real sandbox checkout (Phase 6A–C)~~ — **done.** The user completed the
   browser checkout directly (no browser-automation tool exists in this
   environment, so this always required their hands) and provided the
   resulting license key.
2. ~~Real sandbox API calls (Phase 6D–M)~~ — **done**, by the parent
   conversation, directly against `test.dodopayments.com`. See the completed
   Phase 6 section above. The license key was left in a clean, zero-occupied
   state afterward.
3. **Keychain-backed license logic, real sandbox API, real process restarts —
   done (Phase 6b, above), in an isolated namespace, with production
   Keychain confirmed untouched before and after.** One gap remains and is
   expected to stay: a literal click in the real windowed app's Settings UI
   is still impossible in this session (no computer-use/browser-automation
   tool available to drive a native window). Everything that gap would have
   additionally proven — the IPC plumbing between a button click and
   `invoke()` — carries no licensing-specific logic of its own.
4. Live-mode switch, once a real $14.99 product exists in the Dodo
   dashboard: build without `--features dodo_test_mode`, set
   `DODO_PRODUCT_ID` in `config.rs` to the real product id, set
   `VITE_DODO_CHECKOUT_URL` to the live checkout link for the website.
5. Production-readiness verdict: **the licensing logic itself is now
   verified end-to-end for real** — real sandbox API (activate / validate /
   activation-limit / deactivate / reactivate, Phase 6), real Keychain
   persistence across genuine process restarts, real offline-grace and
   revoked-license handling, all in an isolated namespace that never touched
   production state (Phase 6b). **Still not ready to ship live**, for reasons
   unrelated to correctness: no real $14.99 live-mode product exists yet in
   the Dodo dashboard (item 4 above), the actual windowed app's Settings UI
   has never been clicked through in this environment (no GUI automation
   tool available — see Phase 6b's closing note on why that specific gap is
   low-risk), and the 15 non-English translations from the earlier round
   still want a native-speaker pass, which no round since has touched.

---

# Round 4 — Final pricing, localization & release readiness

Covers the user's 5-phase "Final Pricing, Localization & Release Readiness"
request, layered on top of everything above. No changes were made to the
verified licensing architecture (`trial.rs`, `dodo.rs`, `keychain.rs`,
`mod.rs`'s core logic, or `TRIAL_HMAC_KEY`) — this round found no
reproducible bug in that code, so none was touched, per the user's own
constraint.

## Phase 1 — Pricing & marketing cleanup

Three files genuinely contradicted the real $14.99/trial/license model
(found by grep before this round started, confirmed by reading each):

- `web/src/data/faq.ts` — the "Is MacBook Cleaner free?" answer said "has no
  account, subscription, in-app purchase or license key." Rewritten to
  describe the real 2-day trial / $14.99 one-time / one-Mac-license model,
  reading `PURCHASE.priceDisplay`/`PURCHASE.trialDays` rather than new
  hardcoded literals.
- `web/src/data/seo.ts` — the `/pricing` page's SEO meta description (shown
  in search results and social previews) said "is free to use, with no
  account, subscription, in-app purchase or license key." Rewritten the
  same way.
- `web/src/sections/PrivacySection.tsx` — a privacy-grid tile said "No
  sign-up, no email, no license key." Fixed to distinguish what's still
  true (no account needed to *try* it) from what changed (buying now does
  involve a license key) rather than deleting the privacy point entirely.

**Tax/currency honesty** (user's explicit requirement — don't imply every
customer pays exactly $14.99 inclusive of tax): added a new `PURCHASE.priceNote`
constant in `web/src/config/site.ts` ("USD list price. Shown in your local
currency at checkout; tax may apply depending on your location.") and
surfaced it on `Pricing.tsx` next to the Buy button. Dodo's Adaptive
Currency and merchant-of-record tax handling mean the $14.99 list price is
not necessarily every customer's final charge — this is now stated rather
than implied otherwise.

**"Lifetime updates" check**: grepped for any claim of free lifetime
updates — found none, anywhere. Not adding one; this is a business policy
decision, not mine to assume.

**Desktop app side**: checked `Paywall.tsx`, `Settings.tsx`'s license
section, and `en.json`'s `license.*`/`settings.license.*` keys — these are
the real system's own UI and were already consistent; no contradictory
claims found here, only the website had stale pre-licensing copy.

## Phase 2 — Localization review (all 16 locales) — found and fixed real bugs, not just style

This was **not** a clean pass. Spot-checking for concrete, checkable
correctness (not subjective phrasing) surfaced genuine corruption in 4 of
the 16 locales' license-related strings, all fixed with conservative,
meaning-preserving corrections — nothing was guessed, and nothing that was
already correct was touched:

- **Korean (`ko.json`) — severe, pervasive corruption.** Nearly every
  string in the `license.*`, `settings.license.*`, and the 6
  `errors.native.license*` keys was gibberish (garbled syllable blocks,
  wrong particles, nonsense words mixed into otherwise-plausible sentences
  — e.g. the trial-expired body read in part "...이물갃 등랑푸암
  띨거튘았다 토허해우얕니다..."). Every **other** pre-existing Korean
  string in the same file (file-safety errors, uninstall messages, etc.)
  was fine — the corruption is isolated to exactly the strings added for
  this licensing feature in an earlier round. Rewrote all three sections
  cleanly in consistent, polite-register Korean, preserving every value
  that was already correct (`activateButton`, `activating`, the three
  `toasts.*` strings, `deactivateButton`, etc.) and only replacing what was
  actually broken.
- **Arabic (`ar.json`) — a recurring ق/غ-type character substitution.**
  "إلقاء" (meaning "casting/throwing") was used six times where "إلغاء"
  ("cancel/deactivate") was clearly meant — in `licenseLimitReached`,
  `deactivateButton`, `deactivateConfirmTitle`, `deactivateSuccess`, and
  `deactivateFailed`. Also: "قح" → "قد" (a real word, "might have"),
  "اسطجابة" → "استجابة" (a real word, "response"), and "واتت" → "واحدة"
  (fixed in both `minutes_one` and `hours_one`; confirmed against the
  already-correct `days_one` which uses the matching masculine form
  "واحد", so the fix is grammatically consistent with the rest of the
  file, not a guess).
- **Japanese (`ja.json`) — two corruptions of "インターネット" (internet).**
  `licensedGraceExpired`'s body said "インターキット" and
  `errors.native.licenseNetworkError` said "インターット" (a dropped
  character) — both fixed to "インターネット". Also `remaining.lessThanAMinute`
  said "残も1分未満" where "残り" (the word used correctly everywhere else
  in the same block) was clearly meant; fixed.
- **Hindi (`hi.json`) — five isolated Devanagari corruptions.** "हे" → "है"
  (a vowel-sign error) in two places; "ेक" → "एक" (a dependent vowel sign
  with no base consonant — not valid Devanagari on its own); "देर ें" →
  "देर में"; "रूें" → "रूप"; and `licensedInvalid`'s title ("आपका लाइसेंस
  अब कोई ऩेस नहीं है", not real Hindi) rewritten to "आपका लाइसेंस अब मान्य
  नहीं है" to match the meaning already used correctly in
  `settings.license.status.licensed_invalid` ("लाइसेंस अमान्य").
- **Traditional Chinese (`zh-TW.json`) — one Simplified-character slip.**
  "請連接網路**并**重新整理" used the Simplified form 并 instead of the
  Traditional 並 that the rest of the file consistently uses. Fixed.

**The other 11 locales** (German, Spanish, French, Italian, Dutch, Polish,
Portuguese, Russian, Turkish, Simplified Chinese) were read in full for the
same 9 message categories and found coherent and consistent with English —
no changes made, per the "don't replace what you can't verify is wrong"
instruction. One stylistic note, not a bug: several locales phrase the
trial length as "48 hours" (e.g. German "48-Stunden-Testversion") where the
website now says "2 days" — mathematically identical, not incorrect, but
inconsistent framing. **Not changed by this round** (correcting 15 locales'
phrasing of an equivalent duration is exactly the kind of judgment call
this round was told to be conservative about) — flagged here for whoever
does the native-speaker pass already on the outstanding list.

**Key-parity re-confirmed** after every edit: `node` key-set diff of all 16
locales against `en.json` for the `license.*` group — same pre-existing
CJK `_one` plural-form non-gaps as every prior round, zero new gaps, every
edited file still valid JSON.

## Phase 3 — UI verification

Traced by reading the actual current code:

1. **Buy License → correct checkout**: `license_open_purchase_page`
   (`mod.rs`) builds `https://{DODO_CHECKOUT_HOST}/buy/{DODO_PRODUCT_ID}`
   from the cfg-gated constants, then calls `external_url::open` (host
   allowlist also cfg-gated). The website's Buy button reads
   `PURCHASE.checkoutUrl`, defaulting to the same sandbox link while
   `PURCHASE.isSandbox` is true. Consistent.
2. **Activate → correct command**: `useLicenseStore.activate()` →
   `licenseService.activate(licenseKey)` → `invoke('license_activate', {
   licenseKey })` (`licenseService.ts`) — matches Rust's `license_activate(license_key:
   String)` via Tauri's automatic camelCase↔snake_case argument mapping.
3. **UI updates immediately on activation**: `useLicenseStore.activate()`
   sets `state` directly from the command's return value — no separate
   refresh needed before the UI reflects the new status.
4. **Persists after restart**: already proven for real in Phase 6b (separate
   OS processes, real Keychain, real sandbox key) — not re-tested here.
5. **Deactivate → correct command**: same tracing pattern as #2, confirmed.
6. **Trial-expired shows the right restricted state**: `AppShell.tsx`
   gates on `isLocked(licenseState.status)` (`types.ts`), rendering
   `<Paywall/>`; `Paywall.tsx`'s `titleKey`/`bodyKey` functions select
   `license.paywall.titles/bodies.trialExpired` specifically for that
   status — confirmed by reading both files.
7. **Network errors show useful messages**: both `activate()` and
   `deactivate()` catch and return `errorMessage(err)` (via
   `translateNativeMessage`) rather than swallowing the error or showing a
   raw string — confirmed in `useLicenseStore.ts`.
8. **No sensitive key exposure**: `Settings.tsx` only ever reads
   `license.licenseKeyMasked` (never a raw key) for display; grepped
   `src/features/license`, `Settings.tsx`, `AppShell.tsx`, `Sidebar.tsx`
   for any `console.log`/`console.error` — none found. Re-ran the existing
   static test `license::tests::no_license_key_is_ever_passed_to_a_log_macro`
   (it lives in `mod.rs`, not `dodo.rs` — corrected the invocation path) —
   still passes.

### Manual click-through checklist (requires the real packaged app — no GUI-automation tool exists in this environment)

1. Launch the app on a fresh trial (or after clearing the dev Keychain items) → confirm the sidebar trial badge shows a countdown.
2. Open Settings → License → confirm status, remaining time, and the Buy/Activate UI render without layout glitches.
3. Click **Buy Lifetime License** → confirm the system browser opens the sandbox checkout and shows the correct product name and $14.99 price.
4. Paste a real (or intentionally invalid) license key into the Activate field and click Activate → confirm a clear success or error toast appears.
5. After a successful activation, confirm Settings now shows "Licensed" + the masked key + a Deactivate button.
6. Quit and relaunch the app → confirm it still shows Licensed with no visible delay/flash of the Paywall.
7. Click Deactivate, confirm the dialog, confirm it returns to the trial/trial-expired state.
8. Force the trial into an expired state (or test on a build with `TRIAL_DURATION_MS` temporarily shortened — don't do this on the shipping constant) and confirm the full-screen Paywall blocks the rest of the app and its Activate field still works.
9. Disconnect from the internet, relaunch a licensed install, and confirm it still opens normally (offline grace) rather than locking immediately.

## Phase 4 — Full regression

| Check | Result |
|---|---|
| `cargo test --lib` (default) | 108 passed, 1 ignored, 0 failed — unchanged from the prior round (expected: no Rust logic touched) |
| `cargo test --lib --features dodo_test_mode` | 108 passed, 1 ignored, 0 failed |
| `cargo check` | clean |
| `tsc -b` (desktop) | clean |
| `vite build` (desktop `tsc -b` + website `vite build`) | both clean |
| `npx oxlint` (repo-wide) | same pre-existing warnings as every prior round, zero new |
| Locale parity (16 vs. `en.json`, `license.*` group) | zero new gaps after all Phase 2 edits — same pre-existing CJK plural-form non-issues |
| `cargo build --release` (default features) + binary string check | `strings target/release/macbook-cleaner \| grep -c` for `test.dodopayments.com`/`test.checkout.dodopayments.com`/`pdt_0NqQ5ZKXDNgbggDrQaV2d`: **0**. Same check for `live.dodopayments.com`/`checkout.dodopayments.com`: **2** (proves the grep methodology isn't vacuously passing). |

## Phase 5 — Release readiness

- **Sandbox/production separation**: real, compile-time, re-confirmed above.
- **Payment link configuration**: live-mode `DODO_PRODUCT_ID` in `config.rs` is still the clearly-named placeholder `pdt_REPLACE_WITH_YOUR_PRODUCT_ID` — can't be mistaken for a real value.
- **License delivery**: Dodo's own automatic-fulfillment email (confirmed working in principle by the real sandbox activation in Phase 6, which returned a real `product`/`customer` block). This app has no role in sending that email — it only ever receives and activates a key the customer already has.
- **Keychain persistence**: see Phase 6b — real, isolated, verified, production untouched.
- **Signing & notarization**: `tauri.conf.json`'s `bundle.macOS.signingIdentity` is `"-"` (ad-hoc — no real Apple Developer ID configured in this environment, expected). `scripts/build-dmg.mjs --production` already hard-refuses to build without a real `APPLE_SIGNING_IDENTITY` plus either App Store Connect API credentials or Apple ID/password/team credentials for notarization — this gate already exists and was not weakened. `web/scripts/verify-download.mjs` independently **refuses a production download whose metadata isn't `signature: 'developer-id'` and `notarized: true`** — a second, website-side gate. Neither script was run end-to-end (would need real Apple credentials this environment doesn't have); both were read and their existing logic confirmed sound.
- **macOS permissions**: `capabilities/default.json` unchanged (`core:default`, `core:window:allow-start-dragging`, `notification:default`) — licensing needs no new capability entries, as established in an earlier round (Keychain access and HTTPS from Rust aren't ACL-gated).
- **DMG build**: read `scripts/build-dmg.mjs` in full — not run (would need real signing credentials for a meaningful `--production` run, and a non-production run doesn't exercise anything this round changed).
- **Website pricing/download links**: `Pricing.tsx`'s Buy button and the Download page's link both resolve through the single `PURCHASE`/`DOWNLOAD` config sources in `site.ts` — confirmed by reading both; download-link correctness itself is unrelated to licensing and was not otherwise touched.

### Final production checklist

- [x] Trial system: real, Keychain-backed, tamper/rollback-resistant, verified end-to-end
- [x] License activate/validate/deactivate: verified against the real Dodo sandbox API
- [x] Offline grace period & revoked-license handling: verified
- [x] Sandbox config provably excluded from a default release build (binary-level proof)
- [x] Marketing site and FAQ/SEO copy consistent with the real pricing model
- [x] No secret Dodo API key anywhere (by design — public endpoints only)
- [x] No raw license key in logs or committed files
- [ ] Real live-mode Dodo product created, `DODO_PRODUCT_ID`/`VITE_DODO_CHECKOUT_URL` switched over
- [ ] Native-speaker review of all 16 locales (this round fixed concrete corruption in 4; a full fluency review of all 16 still hasn't happened)
- [ ] Real Apple Developer ID signing + notarization for a production DMG
- [ ] A literal click-through of the packaged app's Settings UI (checklist above; no GUI-automation tool in this environment)
- [ ] Website deploy (nothing in this round was deployed, per instructions)

## Problems fixed this round

1. Three marketing/SEO files contradicting the real pricing model (Phase 1).
2. Missing tax/currency honesty qualifier on every price display (Phase 1).
3. Genuine translation corruption in Korean (severe, ~25 strings), Arabic (8 strings), Japanese (3 strings), Hindi (5 strings), and one Simplified/Traditional Chinese character slip — all confirmed concrete and fixed conservatively (Phase 2).

No bugs were found in the licensing architecture itself; nothing in
`trial.rs`, `dodo.rs`, `keychain.rs`, or `mod.rs`'s core logic was touched.

## Exact files changed this round

```
web/src/config/site.ts            (+PURCHASE.priceNote)
web/src/data/faq.ts                (pricing FAQ rewritten)
web/src/data/seo.ts                (pricing page meta description rewritten)
web/src/sections/PrivacySection.tsx (one privacy-grid tile corrected)
web/src/pages/Pricing.tsx          (added priceNote display)
src/i18n/locales/ko.json           (license/settings.license/errors.native.license* rewritten — was severely corrupted)
src/i18n/locales/ar.json           (6 إلقاء→إلغاء fixes + 3 other word-level typos)
src/i18n/locales/ja.json           (3 インターネット-related typos + 1 word fix)
src/i18n/locales/hi.json           (5 Devanagari character-level corruptions)
src/i18n/locales/zh-TW.json        (1 simplified-character slip)
docs/dodo-sandbox-integration-report.md (this section)
```

## Remaining manual verification

The 9-item click-through checklist above; a full native-speaker fluency
pass on all 16 locales (this round fixed what was concretely broken, not
everything that could theoretically read more naturally); real Apple
signing/notarization; the real live-mode Dodo product setup.

## Production release blockers

1. No real live-mode Dodo product exists yet (`DODO_PRODUCT_ID` is still a placeholder for live mode).
2. No real Apple Developer ID signing/notarization configured in this environment.
3. 16-locale native-speaker review still outstanding (concrete corruption in 4 locales was found and fixed this round, but a full fluency pass hasn't happened).
4. The packaged app's actual Settings UI has never been clicked through end-to-end (no GUI-automation tool available here).

## Final GO / NO-GO assessment

**NO-GO for a live launch**, unchanged from every prior round's honest
assessment — the blockers above are all setup/verification gaps, not
correctness bugs in the code. The licensing *logic* itself has now been
verified about as thoroughly as this environment allows: real sandbox API
calls, real Keychain persistence across real process restarts, real
offline-grace and revocation handling, a binary-level proof sandbox config
can't leak into a release build, and (this round) a correctness pass on the
localized copy that found and fixed real bugs rather than just checking
boxes. What's left is business/ops setup (a real product, real signing
credentials) and two kinds of human verification this environment
structurally cannot perform itself (native-language fluency, a mouse click
in a real window) — not further coding work.

No commits, pushes, deploys, or Live Mode changes were made.
