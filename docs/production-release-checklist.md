# Production release checklist — Apple signing & notarization

Audit performed on this machine, against the real local environment —
every finding below is from an actual command run here, not inferred from
config alone (exact commands are inline). Nothing was submitted to Apple,
no certificate was created or changed, nothing was committed, pushed, or
deployed, and Dodo stayed in sandbox config throughout (confirmed on the
real compiled binary, see "Dodo sandbox leakage" below). No trial anchor,
the HMAC key, any Keychain identifier, or the production bundle identifier
was touched — this round only builds and inspects release artifacts; no
licensing code was changed (none was demonstrated to need changing).

**Bottom line: this app is release-ready from a code and tooling
standpoint. What's missing is entirely credentials/certificates the
project owner must obtain from Apple — not further engineering work.**

---

## Current signing status

| Item | Status | Evidence |
|---|---|---|
| Bundle identifier | ✅ Correct and stable | `com.macbookcleaner.app`, confirmed both in `tauri.conf.json` and in the real built app's `Info.plist` (`CFBundleIdentifier`) |
| Signing identity configured | ⚠️ Ad-hoc (`"-"`) | `src-tauri/tauri.conf.json` → `bundle.macOS.signingIdentity: "-"`. Intentional for local dev (per the existing `docs/distribution.md`) — the release scripts already refuse to treat an ad-hoc build as production (see "Release artifacts" below). |
| Hardened runtime | ✅ Enabled, confirmed on the real binary | `tauri.conf.json` → `hardenedRuntime: true`; verified on the actual compiled app via `codesign -dv`: `flags=0x10002(adhoc,runtime)` — the `runtime` flag is set even on the ad-hoc build, confirming the setting is wired correctly independent of which identity eventually signs it. |
| Entitlements | ✅ Present, minimal, no sandbox | `src-tauri/Entitlements.plist` grants exactly one entitlement, `com.apple.security.automation.apple-events` (used for the app's Apple Events/automation needs). Verified on the real signed binary via `codesign -d --entitlements :-` that this is the *only* entitlement embedded — in particular, **no `com.apple.security.app-sandbox`**, confirmed in the prior round's audit and re-confirmed here. No additional entitlement is needed for Hardened Runtime for a non-sandboxed WebView app like this one (no JIT, no unsigned-memory execution, no library-validation bypass in use). |
| Code signature integrity | ✅ Passes (for what ad-hoc proves) | `codesign --verify --deep --strict --verbose=2` on the real built `.app` → `valid on disk`, `satisfies its Designated Requirement`. This only proves internal consistency, not Gatekeeper trust (see below). |
| Gatekeeper assessment | ❌ Rejected (expected) | `spctl -a -vvv --type execute "MacBook Cleaner.app"` → **`rejected`** (exit code 3). Expected and correct for an ad-hoc-signed, non-notarized app — this is the actual blocker a real user hitting Gatekeeper would see today, confirmed directly rather than assumed. |
| Notarization | ❌ Not notarized | Confirmed two ways: (1) the `tauri build` log explicitly printed *"Warn skipping app notarization, no APPLE_ID & APPLE_PASSWORD & APPLE_TEAM_ID or APPLE_API_KEY & APPLE_API_ISSUER & APPLE_API_KEY_PATH environment variables found"*; (2) `xcrun stapler validate` on the built app → *"does not have a ticket stapled to it."* |
| Dodo sandbox leakage in production build | ✅ Clean | `strings` on the real release binary, searched for `test.dodopayments.com`, `test.checkout.dodopayments.com`, and the sandbox product id — **none found**. `dodo_test_mode` is a non-default Cargo feature (`default = []` in `Cargo.toml`); a plain `cargo build`/`tauri build` (used for this round's release binary) cannot accidentally include it. |

## Certificate requirements

| Requirement | Status |
|---|---|
| A Developer ID Application certificate in the login Keychain | ❌ **Missing.** `security find-identity -v -p codesigning` lists exactly one identity: `"Apple Development: Deepak Panwar (GQ7F4HRCGT)"`. This is an **Apple Development** certificate (for running your own builds on your own registered devices via Xcode) — a different certificate type from **Developer ID Application**, which is the one actually required for notarized distribution outside the App Store. The Team ID (`GQ7F4HRCGT`) visible in that identity's name confirms an Apple Developer account already exists and is linked to this Mac — generating the missing Developer ID Application certificate from that same account (via Xcode → Settings → Accounts → Manage Certificates, or developer.apple.com) is very likely all that's needed here, not a fresh enrollment. |
| `APPLE_SIGNING_IDENTITY` env var | ❌ Unset | Checked directly (presence only, value never read or printed). `scripts/build-dmg.mjs` already refuses a `--production` build without this being a non-ad-hoc identity string. |

**This certificate cannot be created or installed by this audit** — per the
task's own instruction, no certificate was created or changed. Only the
project owner, signed in with the Apple Developer account behind Team ID
`GQ7F4HRCGT`, can generate it.

## Notarization requirements

| Requirement | Status |
|---|---|
| Either an App Store Connect API key (`APPLE_API_ISSUER` + `APPLE_API_KEY` + `APPLE_API_KEY_PATH`) **or** Apple ID credentials (`APPLE_ID` + `APPLE_PASSWORD` + `APPLE_TEAM_ID`) | ❌ **All six env vars unset**, checked directly by presence, not value. |
| `notarytool` / `stapler` tooling available locally | ✅ Yes — `xcrun --find notarytool` and `xcrun --find stapler` both resolve (Xcode Command Line Tools), confirmed by running them. |
| Notarization + stapling automation | ✅ Already wired, nothing to build | Tauri's own bundler calls notarization and stapling automatically during `tauri build` whenever the credential env vars above are present (confirmed by the exact warning text Tauri prints when they're absent — it only warns about *skipping* notarization, implying it actively checks for and would otherwise perform it). `scripts/build-dmg.mjs` then independently re-verifies the result (Developer ID signature authority + `stapler validate`) rather than trusting the build step blindly, and refuses to copy a production artifact into `release/` unless both checks pass. **No new notarization code needs to be written — it already exists and already fails safely without credentials.** |

## Release artifacts

| Target | Rust toolchain ready? | Built this round? |
|---|---|---|
| `aarch64-apple-darwin` (Apple Silicon) | ✅ Installed (`rustup target list --installed`) | ✅ Yes — ad-hoc `.app` + DMG built via `tauri build`, confirmed `arm64` via `lipo -archs`, version `1.0.0` matches `tauri.conf.json` |
| `x86_64-apple-darwin` (Intel) | ❌ **Not installed** | Not built | Needed for `npm run dmg:intel` or `dmg:universal`. Install explicitly before use: `rustup target add x86_64-apple-darwin` — this project's own `build-dmg.mjs` deliberately never installs a missing target automatically (see `docs/distribution.md`), so this is a one-time manual step for whoever builds an Intel/universal artifact, not a gap in the script. |
| `universal-apple-darwin` | ❌ Blocked on the above | Not built |

An ad-hoc, non-production DMG from an *earlier, unrelated session* already
exists at `release/MacBook-Cleaner-1.0.0-apple-silicon.dmg` (dated Oct 12,
predates this audit). Its own `latest.json` already self-reports
`"signature": "adhoc"`, `"notarized": false`, `"productionTrusted":
false` — consistent with every finding above, not a surprise. `release/`
is git-ignored; nothing here risks being committed.

**The DMG build pipeline itself (`scripts/build-dmg.mjs`) needed no
changes** — it already: refuses a `--production` build without a real
Developer ID identity string and without either notarization credential
set present; mounts the resulting DMG read-only and independently
re-verifies architecture (`lipo`), signature authority chain, and a
stapled notarization ticket before ever copying anything into `release/`;
and writes a `latest.json` manifest recording exactly what was verified.
This is already a correct, safe pipeline — it was audited, not rewritten.

## Updater compatibility

**There is currently no auto-update mechanism in this app at all** —
checked directly, not assumed:

- No `tauri-plugin-updater` dependency in `src-tauri/Cargo.toml`.
- No `@tauri-apps/plugin-updater` reference anywhere in the frontend.
- No `plugins.updater` block in `tauri.conf.json` (only
  `"createUpdaterArtifacts": false`, which is simply the bundler flag for
  *generating* updater-compatible artifacts — it has nothing to update
  against, since no updater plugin consumes them).
- No updater signing keypair (`.key` file) exists anywhere in the repo.

**This means "is the updater compatible with the release config" has a
simpler answer than expected: there is nothing to be compatible or
incompatible — updates today mean the user re-downloads and reinstalls a
new DMG.** This is not a regression introduced by this round and not
something this audit should silently start building (the task asked for a
*signing/notarization* release, and adding an entirely new updater
subsystem would be exactly the kind of unrequested architecture change the
task's own rules caution against). Flagging it here as a release-planning
fact for the project owner to decide on, not a defect.

## Fresh installation / upgrade testing

Neither was executed destructively against this machine's real, shared
state — consistent with the explicit instruction to preserve the existing
trial anchors, HMAC key, Keychain identifiers, and production bundle
identity, and with the prior round's own established practice of never
running the production-identified binary against real production paths.
What *was* checked safely, without ever launching the app:

- ✅ **DMG mounts and contains a correctly-formed app bundle**: verified
  by `build-dmg.mjs` itself (which mounts, reads `Info.plist`, checks
  architecture via `lipo`) during this round's build — passed.
- ✅ **Bundle identity is correct and stable**: `com.macbookcleaner.app` /
  `1.0.0`, matching `tauri.conf.json` exactly, confirmed on the actual
  built artifact.
- ✅ **First-launch trial start and Keychain/shared-anchor persistence
  logic itself**: already exhaustively verified in the prior round's
  release-QA pass (126/126 tests, plus a real isolated end-to-end harness
  using disposable Keychain/filesystem locations) — not re-run here, since
  this round's task is signing/notarization, not licensing logic, and no
  licensing code changed.
- 🔧 **Requires manual testing** (needs a real Developer ID + notarized
  build, which this environment cannot produce without credentials the
  task says not to create/use without approval):
  1. Download the notarized DMG on a **different, clean Mac** (or a fresh
     VM) that has never run this app before.
  2. Confirm Gatekeeper accepts it on first open (no "unidentified
     developer" block) — expect `spctl --assess` to report `accepted`
     once signed + notarized + stapled, in contrast to the `rejected`
     result reproduced in this audit for the current ad-hoc build.
  3. Confirm the app launches, the Dock icon and menu bar are correct, and
     the trial starts.
  4. Install an older build first, then replace it with the new signed
     build in `/Applications` (simulating an upgrade) and relaunch —
     confirm the trial/license state carries over unchanged. (The
     underlying mechanism for this — Keychain items and the
     `/Users/Shared` anchor both surviving a binary replacement — is
     already proven in the prior round; this step is about confirming
     the *installer/replace* mechanics specifically, e.g. that dragging a
     new `.app` over the old one in Finder doesn't prompt to merge/trash
     any user data.)

## Verification results (Phase 3), categorized exactly as requested

**Successfully verified** (ran for real, in this environment, this round):
- `codesign --verify --deep --strict` on the built `.app` → valid.
- `codesign -d --entitlements :-` → confirms exactly one entitlement, no sandbox.
- `codesign -dv` → hardened-runtime flag present.
- `spctl -a -vvv --type execute` → `rejected` (correctly, for an ad-hoc/unnotarized build — this *is* the real blocker, not a tooling failure).
- `xcrun stapler validate` → correctly reports no ticket.
- `lipo -archs` → `arm64`, matches the only installed Rust target.
- `strings` scan for sandbox Dodo endpoints in the release binary → clean.
- `security find-identity -v -p codesigning` → exactly one identity, confirmed to be Apple Development, not Developer ID.
- Notarization credential env vars → confirmed all unset, by presence check only.
- `rustup target list --installed` → only `aarch64-apple-darwin`.
- `git check-ignore` on `release/` → confirmed ignored, nothing at risk of being committed.
- `cargo test --lib` (both feature configs) → 126/126, re-run clean, unaffected by this round (no licensing code touched).

**Configuration ready but not executed:**
- Universal/Intel DMG build (`npm run dmg:universal` / `dmg:intel`) — script and config are correct and already gate correctly on missing credentials; simply never run this round because the required Rust target isn't installed and because a production build without real credentials would just fail by design.
- Notarization + stapling via `tauri build` — already implemented (Tauri's built-in flow, independently re-verified by `build-dmg.mjs`); not executed because no credentials are present to execute it with.
- `npm run dmg:production` — ready, will correctly refuse to run without `APPLE_SIGNING_IDENTITY` + notarization credentials (verified by reading the script's own guard logic), not executed.

**Blocked by missing credentials:**
- A Developer ID Application certificate (only an Apple Development certificate is present).
- Any notarization credential set (API key or Apple ID app-specific password) — all six related env vars unset.
- A real, Gatekeeper-accepted, notarized, stapled `.app`/DMG — depends on both of the above.

**Requires manual testing:**
- A true fresh install on a separate, clean Mac/VM.
- A true upgrade-in-place test with a real signed build.
- Native-speaker fluency review of all 16 locales (carried over from the prior round's report — unrelated to signing, still outstanding).
- A literal click-through of the packaged app's UI (no GUI-automation tool available in this environment — carried over from prior rounds).

## Remaining blockers

1. **No Developer ID Application certificate** — only an Apple Development certificate exists. Must be generated by the project owner from the Apple Developer account behind Team ID `GQ7F4HRCGT`.
2. **No notarization credentials configured** — needs either an App Store Connect API key or an Apple ID app-specific password, supplied via environment variables, never committed to the repo.
3. **No Intel/universal Rust target installed** — one-line fix (`rustup target add x86_64-apple-darwin`) whenever an Intel or universal artifact is wanted; not required for an Apple-Silicon-only first release.
4. **No auto-update mechanism exists** — not a blocker for an initial release, but a product decision the project owner should make explicitly (see "Updater compatibility" above) rather than discover later.
5. Carried over from the prior round, unrelated to signing: no full native-speaker locale fluency pass, no Firebase project selected for the website, no literal GUI click-through test.

## Exact next steps to complete the release

1. In the Apple Developer account for Team ID `GQ7F4HRCGT`, generate a **Developer ID Application** certificate (Xcode → Settings → Accounts → Manage Certificates → "+" → Developer ID Application, or via developer.apple.com → Certificates). Install it in this Mac's login Keychain.
2. Obtain one notarization credential set and export it as environment variables **only in the local shell, never committed**:
   - App Store Connect API key: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH` (path to the downloaded `.p8` file), **or**
   - Apple ID: `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password, not the account password), `APPLE_TEAM_ID`.
3. Export `APPLE_SIGNING_IDENTITY='Developer ID Application: <Name> (<TEAMID>)'` to match the certificate from step 1.
4. Run `npm run dmg:production` (Apple Silicon) — the script will build, sign, let Tauri notarize + staple automatically, and independently re-verify the result before writing anything into `release/`.
5. For an Intel or universal artifact, first run `rustup target add x86_64-apple-darwin`, then `npm run dmg:intel` or `npm run dmg:universal -- --production`.
6. Run the independent checks already documented in `docs/distribution.md` against the mounted, production DMG: `codesign --verify --deep --strict`, `spctl --assess --type execute` (expect `accepted` this time), `xcrun stapler validate`, `lipo -archs`, `shasum -a 256`.
7. Perform the manual fresh-install and upgrade tests described above on a separate Mac/VM.
8. Decide on an auto-update strategy (or explicitly decide not to have one for v1) before announcing a release channel to users.
9. Only after all of the above: proceed to website deployment (`docs/distribution.md` already documents the Firebase/download-link flow) and the actual public announcement — neither performed or started by this audit.

No code was committed, pushed, or deployed. No Apple certificate was created or changed. Nothing was submitted to Apple for notarization. Dodo Live Mode was not enabled.
