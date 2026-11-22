# Dodo Payments — going from sandbox to Live Mode

Audit only — **no code was changed to perform this cutover**, since it
requires a real Dodo dashboard product and real credentials this
environment doesn't have. This document is the exact remaining checklist.

## What's already correct and doesn't need to change

- **Test and live can never mix within one binary.** `DODO_API_BASE`,
  `DODO_CHECKOUT_HOST`, and `DODO_PRODUCT_ID` are each a `#[cfg]`-gated
  pair in `src-tauri/src/license/config.rs`, selected by the `dodo_test_mode`
  Cargo feature at **compile time** — not read from an env var or a
  runtime flag, so there is no code path where a live build could
  accidentally talk to the sandbox API or vice versa. A regression test
  (`test_mode_and_live_mode_config_never_collide` in `license/mod.rs`)
  already asserts this.
- **No secret API key exists anywhere, in either mode.** `/licenses/
  activate`, `/validate`, and `/deactivate` are Dodo's public,
  unauthenticated endpoints by design — confirmed in this codebase's own
  prior rounds and re-confirmed now by grep: the only matches for
  "secret"/"key" near Dodo code are comments stating there is no secret to
  leak. There is nothing in this application that *could* leak a merchant
  credential, because none is ever present.
- **$14.99 one-time pricing and the 48-hour trial are untouched** —
  `TRIAL_DURATION_MS` (172,800,000 ms) and `web/src/config/site.ts`'s
  `priceDisplay: '$14.99'` are exactly as before.
- **The website's Buy button is already safely gated**: when
  `VITE_DODO_CHECKOUT_URL` isn't set to a real live URL, `Pricing.tsx`
  renders a genuinely disabled button with a clear "not available yet"
  message — not a live link to the sandbox checkout. This was fixed in an
  earlier round and reconfirmed intact just now.

## What's still a placeholder (confirmed, not assumed)

```rust
#[cfg(not(feature = "dodo_test_mode"))]
pub const DODO_PRODUCT_ID: &str = "pdt_REPLACE_WITH_YOUR_PRODUCT_ID";
```

This is the **only** thing standing between the current code and a real
live launch. Nothing else in the activate/validate/deactivate/refresh path
needs to change — it already uses whichever `DODO_API_BASE`/
`DODO_PRODUCT_ID` pair the build was compiled with.

## Exact steps you need to do in the Dodo dashboard

1. Switch the dashboard out of Test Mode into Live Mode (top-level toggle).
2. Create the real product: one-time payment, **$14.99**, License Keys
   entitlement enabled with **automatic fulfillment by email**, activation
   limit **1** (one Mac per license) — the same configuration the sandbox
   product already uses, just in Live Mode.
3. Enable **Adaptive Currency** in Business Settings (a dashboard toggle;
   nothing in this app's code calls anything for it).
4. Copy the real product ID (`pdt_...`) and the real static checkout link
   from that product's "Share" page (same place the sandbox link was found
   in an earlier round — Dodo's docs don't document this URL directly).

## Exact steps to wire those into this codebase

1. Replace the placeholder in `src-tauri/src/license/config.rs`:
   ```rust
   #[cfg(not(feature = "dodo_test_mode"))]
   pub const DODO_PRODUCT_ID: &str = "pdt_YOUR_REAL_LIVE_PRODUCT_ID";
   ```
2. Set the website's live checkout URL, either in `web/.env.production`
   (gitignored — never commit it) or directly in your hosting provider's
   environment variable settings:
   ```
   VITE_DODO_CHECKOUT_URL=https://checkout.dodopayments.com/buy/pdt_YOUR_REAL_LIVE_PRODUCT_ID?quantity=1
   ```
   The moment this is set to a non-empty value, `PURCHASE.isSandbox`
   becomes `false` and the Buy button on `/pricing` switches from
   disabled to live automatically — no other code change needed.
3. Build the desktop app **without** `--features dodo_test_mode` (the
   default — a plain `cargo build`/`tauri build` already does this).
4. Rebuild the website (`npm run web:build:release`) with the env var
   from step 2 set.

## Verification you (or I, once a real live product exists) should run before announcing

- A single real `$14.99` test purchase, end to end, watching for: the real
  email arriving with a real license key, activation succeeding in the
  app, the license surviving a restart, and deactivation freeing the slot
  — exactly the same sequence already verified against the **sandbox**
  product in an earlier round, just against the live one this time.
- Confirm the live build's binary contains **zero** sandbox strings
  (`strings` check — already proven as a repeatable, scriptable check in
  an earlier round) and the sandbox build's binary contains zero live
  product-ID strings.

Not performed in this round: no real product was created (no Dodo
dashboard access), so no real live purchase was made or could be made.
