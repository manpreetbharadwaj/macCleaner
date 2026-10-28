# Trial & license abuse-prevention audit

**Update (follow-up round): Recommendation 1 below has now been
implemented, tested, and verified for real** — see
["Implementation record" below](#implementation-record-recommendation-1)
for exactly what changed, what was verified, and what remains a known
limitation. The rest of this document is the original audit and is left
intact below; only the parts about Recommendation 1's status are now
superseded by that new section. `TRIAL_HMAC_KEY` was **not** changed, no
production Keychain entry or production trial record was touched (verified
directly — see the implementation record), and nothing was committed,
pushed, or deployed.

Everything below this point (except the new section linked above) is the
*original* audit, written before any code changed, kept verbatim for
context.

Scope: the existing trial system (`src-tauri/src/license/trial.rs`) and the
Dodo Payments license system (`dodo.rs`, `mod.rs`, `keychain.rs`), both
already built and verified for correctness in
[`dodo-sandbox-integration-report.md`](dodo-sandbox-integration-report.md).
This document asks a different question: not "does it work?" (yes, verified
repeatedly against the real sandbox API) but "how hard is it to abuse, and
is that cost worth paying down?"

---

## Scenario 1 — repeated 48-hour trials

### What's already prevented

- **A normal app update** (replacing the `.app` bundle, same bundle id):
  doesn't touch Keychain at all. `SERVICE`/`ACCOUNT` in `trial.rs` are fixed
  string literals, not derived from app version or install path — an update
  is trial-safe today, with no code change needed. (This directly answers
  the "prevent accidental trial resets during app updates" requirement:
  it's already true, and the main risk going forward is a future developer
  renaming those constants without realizing the implication — see
  Recommendation 3 below for a cheap regression guard.)
- **Uninstall + reinstall of the app itself**: Keychain items are not tied
  to the app bundle's lifecycle on macOS — deleting and redownloading the
  `.app` does **not** reset the trial, because the Keychain item survives.
  This was the original design rationale (see `keychain.rs`'s doc comment)
  and holds.
- **Turning the system clock back**: caught by the monotonic
  `last_seen_at_ms` high-watermark (`trial.rs::clamp_rollback`), verified by
  existing unit tests.
- **Editing the stored timestamp directly** (e.g. via Keychain Access.app or
  the `security` CLI, without knowing `TRIAL_HMAC_KEY`): caught by the HMAC
  signature check — an invalid signature is treated as tampered and fails
  safe to "expired," never trusted.

### What remains exploitable

1. **Deleting the specific Keychain item** (`security delete-generic-password
   -s com.macbookcleaner.app.trial -a anchor`, or the equivalent click in
   Keychain Access.app). On the next launch, `trial::load_or_start` finds
   nothing and starts a fresh 48-hour trial. This has been an openly
   documented, accepted limitation since the system was first built —
   nothing new here, just re-confirming it's still true.
2. **Creating a new macOS user account on the same Mac.** Each macOS user
   account has its own login keychain
   (`~/Library/Keychains/login.keychain-db` is per-user) — a new user
   account is a completely separate Keychain, with zero Terminal literacy
   required. System Settings → Users & Groups → Add Account is a normal,
   documented macOS feature, not an "attack" in any technical sense, which
   made this meaningfully easier to stumble into (or deliberately exploit)
   than scenario 1's Keychain-deletion route. **As of the implementation
   record below, this is now mitigated**: a new account inherits the
   machine-wide anchor's earlier trial start instead of getting a fresh
   one, verified for real against a real Keychain and a real filesystem
   path (not just reasoned about). It is no longer true that this gap is
   "not mitigated at all" — see the implementation record for the exact,
   narrower residual gap that remains (an attacker now has to find and
   delete *two* things instead of one).
3. A full OS reinstall or a different physical Mac obviously resets
   everything too, but carries real friction (time, risk, data loss) —
   a much weaker practical threat than #1 or #2.

### Severity, stated plainly

For a **$14.99 one-time utility**, repeated free trials are a soft,
low-stakes leak, not fraud against a payment system — the "damage" is
extended free use, not financial loss. Nearly every honor-system,
server-less trial scheme (which is what the user explicitly asked for:
"no account, credit card, or registration required to start the trial")
has this same shape of leak. This is worth saying outright before reaching
for a fix: the right bar here is "close the easy, no-skill bypass,"
not "build DRM."

---

## Scenario 2 — shared license key, offline reuse

### What's already prevented (and verified for real, not just reasoned about)

**The main sharing scenario — give the key to a friend who activates it on
their own, normally-online Mac while you keep using yours — is already
fully prevented, server-side, by Dodo's own `activation_limit: 1`.** This
was verified against the real sandbox API in an earlier round: a second
`activate` call for an already-occupied key gets a real `422
LICENSE_KEY_LIMIT_REACHED`, unconditionally, regardless of anything our
client does. This is the correct place for this control to live — it can't
be bypassed by editing local files, because the enforcement isn't local.

### The one real, named gap: deactivate-then-air-gap

Walking through exactly how the pieces interact, there is one concrete,
narrow exploit:

1. User activates the key on Mac A (consumes the slot).
2. User deactivates Mac A **not through Mac A's own app** (e.g. via Dodo's
   customer-facing portal, or by asking support) — crucially, this means
   Mac A's own local Keychain cache is never told. If the deactivation
   happens through Mac A's own "Deactivate this Mac" button instead, Mac
   A's local state updates to `Trial` immediately, in the same call — no
   gap exists in that case.
3. The now-freed slot lets Mac B activate successfully.
4. Mac A, as long as it is kept **offline, or simply never relaunched**,
   never calls `license_refresh` again, so its cached
   `last_valid: true` / `last_validated_at_ms` (from before the remote
   deactivation) never updates. `compute_state`'s grace-period math keeps
   reporting `Licensed` for up to **14 days** past that last successful
   check — not because anything is broken, but because that's exactly what
   the offline grace period is *for* (not punishing a legitimately
   traveling, disconnected user).
5. The moment Mac A is online again and the app is relaunched,
   `license_refresh` fires automatically (`useLicenseStore.init()`), calls
   `/licenses/validate` with Mac A's own instance id, gets a real `valid:
   false` back (the instance was deactivated), and locks immediately. The
   window self-closes the instant Mac A reconnects.

**Net effect:** this lets at most 2 Macs run simultaneously licensed for at
most 14 days, and only if Mac A is deliberately kept air-gapped (or just
never reopened) for that whole window, and only if the deactivation happens
through a path other than Mac A's own app. That's a real, nameable gap —
but it requires sustained, deliberate effort (keeping a Mac offline on
purpose) for a bounded, modest payoff. It is not "one key running on
unlimited Macs forever."

### How the 14-day grace period specifically affects this

The grace period is the *entire* mechanism that creates the above window —
without it, any license check failure would lock immediately, closing the
gap but also locking out any legitimate user who loses internet for more
than one app launch (a real cost: flight, remote travel, an ISP outage).
14 days was chosen for user-friendliness, not derived from a threat model.
It is a **tunable dial**, not a fixed property of the design:

- Shortening it (e.g. to 3–7 days) shrinks the abuse window proportionally,
  at the direct cost of inconveniencing legitimate offline users sooner.
- It cannot be removed entirely without breaking the explicit requirement
  to "handle offline use... safely" and "not treat every temporary network
  failure as a revoked license."

This is a business trade-off between abuse-window size and legitimate-user
friction, not something to decide unilaterally in this document — flagging
it as a dial worth the user's own judgment call, with the current 14-day
value and its concrete consequence now documented precisely.

---

## Recommended strategy

### Recommendation 1 (primary, scenario 1): a redundant, machine-wide trial anchor in `/Users/Shared/`

**What:** in addition to the existing Keychain anchor, write the same
HMAC-signed `{started_at_ms, last_seen_at_ms, sig}` blob to a second
location: `/Users/Shared/.com.macbookcleaner.trial-anchor` (or similar).
`/Users/Shared/` is writable by every local user account **without any
privilege elevation** (standard macOS permissions, no `sudo`, no admin
password prompt) and — critically — is **shared across every macOS user
account on that one physical machine**.

**Why this is the right-sized fix:** it directly and only targets gap #2
above (new macOS user account = new trial), with:
- **Zero new friction**: no permission dialog, no network call, no account.
- **Zero new privacy surface**: it's the same locally-computed, locally-
  verified timestamp, just duplicated to a second local file — nothing
  leaves the machine, nothing new is collected.
- **Zero new dependencies**: plain file I/O, reusing the exact `sign`/
  `verify` functions already in `trial.rs` (same `TRIAL_HMAC_KEY`,
  unchanged, per the constraint).
- **Self-healing reconciliation**: on load, read both anchors. If they
  disagree, trust whichever one reports the **earlier** `started_at_ms`
  (the one less likely to have been reset by the exact abuse path this is
  defending against), and silently rewrite the other to match. If only one
  exists, treat it as authoritative and recreate the missing one from it.
  This also means the two anchors insure each other against a future
  installer or update script accidentally clearing just one of them.

**What it does not fix:** a user who already knows to delete the Keychain
item specifically now also needs to find and delete this second,
less-obvious file — a real improvement in required skill (closes the
*easy*, no-terminal, System-Settings-click bypass) but not a guarantee
against someone who goes looking for both. That's an honest, bounded
improvement, not a claim of full prevention — consistent with this
codebase's existing "detect obvious tampering, don't build DRM" stance.

**Complexity:** small. One new ~40-line module mirroring `trial.rs`'s
existing read/write/reconcile shape, no new crates, no new Tauri commands,
no frontend changes. Estimated a few hours including tests.

**Cost:** $0, no ongoing maintenance, no new infrastructure.

### Recommendation 2 (optional, scenario 2): shorten the offline grace period, or leave it

Not a code change — a one-line constant (`OFFLINE_GRACE_MS` in
`config.rs`) if the user decides the 14-day exploit window above is worth
narrowing. Explicitly presented as a judgment call for the user, with the
exact trade-off already quantified above, not a recommendation to act on
without their input.

### Recommendation 3 (hygiene, both scenarios): regression-guard the Keychain service names

Add a trivial test asserting `SERVICE == "com.macbookcleaner.app.trial"`
and the license module's equivalent — so a future refactor can never
silently rename these constants (which would reset every existing user's
trial/license state on their next update) without a test failing first.
Minutes of work, directly addresses "prevent accidental trial resets during
app updates" as a forward-looking guarantee, not just today's audit finding.

### Explicitly not recommended: a Cloudflare Worker + D1 trial registry

See the full comparison below — the short version is that, **without a
stable device identifier or an account (both explicitly ruled out), a
server-side trial registry provides no additional protection over the
current Keychain-only design for scenario 1**, while adding real new cost,
complexity, a network dependency on first launch, and a new privacy
surface. It is not recommended for v1.

---

## Keychain-only vs. Cloudflare Worker + D1: a direct comparison

| | Keychain-only (current) + Recommendation 1 | Cloudflare Worker + D1 registry |
|---|---|---|
| **Stops Keychain deletion** | No (unchanged; accepted limitation) | No — same problem: without a stable key to register against, a wiped local ID just re-registers as "new" |
| **Stops new macOS user account** | **Yes**, via the `/Users/Shared` redundant anchor | **No**, for the same reason — a fresh locally-generated ID per user account looks identical to a genuinely new installation to the server |
| **Stops a full OS reinstall / new Mac** | No (by design — not the goal) | No, same reason, *unless* paired with a stable hardware identifier (e.g. `IOPlatformUUID`) — which reintroduces exactly the "hardware fingerprinting" trade-off the user asked to avoid, just relocated server-side |
| **Needs an account** | No | No (can stay anonymous-ID based) |
| **Needs internet to start a trial** | No | Would need one (or a fallback-to-offline path, which then re-opens the exact gap it was built to close — so Keychain logic has to stay anyway) |
| **New privacy surface** | None | Yes — a server now logs real IP + timestamp of every trial start; needs a privacy-policy update |
| **New engineering surface** | None (reuses existing functions) | Worker code + deployment pipeline, D1 schema + migrations, a new public write endpoint that itself needs its own anti-abuse/rate-limiting (an unauthenticated "register a trial" endpoint is a fresh abuse vector on its own), ongoing monitoring |
| **Dollar cost** | $0 | Near-$0 at this app's scale (Workers/D1 free tiers comfortably cover it) — the real cost is engineering/ops time, not hosting fees |
| **Value for scenario 2 (license sharing)** | Dodo's own `activation_limit` already provides authoritative, server-side enforcement — nothing to add here | Could add *observability* (e.g. flag a key validating from many distinct IP ranges) for manual review, but this is detection, not stronger enforcement, and the underlying abuse is already structurally bounded by Dodo's own limit |

**Bottom line:** the Cloudflare option is a plausible design *only* once
paired with a stable per-device identifier or an account — and the user's
own constraints rule both out. Built as specified (no accounts, no
fingerprinting), it doesn't close any gap the current design doesn't
already have, while adding real cost. Recommendation 1 is cheaper, simpler,
and actually targets the one gap that matters (new user account) directly.

---

## Test cases

1. Trial anchor survives app uninstall + reinstall — **already verified**
   empirically in `dodo-sandbox-integration-report.md`'s Phase 6b.
2. Trial anchor does **not** survive a deliberate deletion of *both*
   anchors — **verified** by the real end-to-end harness (step 1/first-
   launch case) and by `reconcile_both_missing_starts_a_fresh_trial_now`;
   this is expected and accepted, not a bug.
3. ✅ **Verified for real** (implementation record, "Real
   tests run" step 2): a new macOS user account (simulated by clearing the
   disposable per-account Keychain anchor while leaving the shared anchor
   intact) reads the machine-wide anchor and does **not** get a fresh
   trial — it inherits the original, earlier `started_at_ms`.
4. ✅ **Verified for real**: Keychain anchor deleted, shared anchor intact
   → trial state restored from the surviving anchor, and the Keychain
   anchor self-heals (recreated with the correct value on the next read).
5. ✅ **Verified for real**: shared anchor deleted, Keychain anchor intact
   → trial state is unaffected, and the shared anchor self-heals back into
   existence.
6. ✅ **Verified** (unit test + end-to-end harness step 1): both missing →
   genuinely fresh trial — the honestly irreducible case without a
   server+hardware-id or an account.
7. App update (binary replaced, same bundle id, same constants) → neither
   anchor is affected — regression-guarded by the new
   `service_and_account_names_are_regression_guarded` /
   `license_service_and_account_names_are_regression_guarded` tests
   (Recommendation 3, now implemented).
8. Scenario 2: key activated on Mac A (online, normal use), second
   `activate` attempted for Mac B while Mac A's instance is still live →
   real `422`, rejected — **already verified for real** against the sandbox
   API (unaffected by this round's change).
9. Scenario 2: Mac A deactivated via a path other than its own app, then
   kept offline for >14 days, then reconnected → locks on the very next
   successful `license_refresh` — verifiable using the same isolated-
   Keychain-namespace harness pattern already used in Phase 6b (backdate
   `last_validated_at_ms`, set `last_valid`, confirm `compute_state`'s
   output); not re-run this round since nothing in the license/activation
   path changed.
10. A symlink pre-planted at the shared-anchor path is refused for both
    read and write, and the symlink's target is left untouched — ✅
    **verified** by
    `a_symlink_at_the_path_is_never_followed_for_read_or_write`.
11. The shared anchor file is created at mode 0644 (world-readable,
    owner-write-only) regardless of the process umask — ✅ **verified** by
    `created_file_is_world_readable_and_owner_write_only_regardless_of_umask`.
12. A tampered single anchor (failed HMAC verification) is rescued by a
    still-valid second anchor instead of forcing lockout, while still
    surfacing `tamper_detected` — ✅ **verified** by
    `reconcile_rescues_the_trial_when_one_source_is_tampered_but_the_other_verifies`.
    Both anchors tampered (or one tampered with nothing to rescue it) still
    forces the original fail-safe lockout — ✅ **verified** by
    `reconcile_forces_expiry_when_both_sources_are_invalid` and
    `reconcile_forces_expiry_when_the_only_present_source_is_invalid_and_the_other_is_missing`.

---

## Implementation record (Recommendation 1)

This section documents what was actually built, in a follow-up round to
the audit above. Everything above this point was analysis only, written
before any code existed; this section is the real result.

### What changed

- **New file**: `src-tauri/src/license/shared_anchor.rs` — a small,
  self-contained module with exactly two operations, `read_raw(path)` and
  `write_raw(path, bytes)`, both taking the path as a parameter (not
  hardcoded inline) so they're independently unit-testable against a
  disposable temp directory without ever touching `/Users/Shared`. A
  separate `default_path()` returns the real
  `/Users/Shared/.com.macbookcleaner.trial-anchor` location used in
  production.
- **Modified**: `src-tauri/src/license/trial.rs` — `load_or_start` now
  reads *both* the Keychain anchor and the shared anchor, reconciles them
  through a new pure function (`reconcile`, fully unit-tested, see below),
  and self-heals whichever side is missing or stale. The exact same
  `sign`/`verify` functions and the exact same `TRIAL_HMAC_KEY` are reused
  for both anchors — **the HMAC key was not touched**. `SERVICE`/`ACCOUNT`
  (the Keychain identifiers) were not renamed.
- **Modified**: `src-tauri/src/license/mod.rs` — registered the new
  `shared_anchor` module (private — only `trial.rs` uses it) and added a
  regression-guard test for `LICENSE_SERVICE`/`LICENSE_ACCOUNT` (the
  license-side equivalent of Recommendation 3, bundled in since it was
  already recommended above and is a two-line addition to a file already
  being touched).
- Nothing in `src/` (the frontend), `dto.rs`, `config.rs`, `dodo.rs`,
  `keychain.rs`, or any Tauri command signature changed. `tamper_detected`
  keeps exactly its existing meaning and UI wiring (see "tamper_detected
  semantics" below for the one subtlety).

### How the reconciliation actually works

`reconcile(keychain_source, shared_source, now)` is a pure function (no
Keychain or filesystem access) that:

1. Treats each source as `Valid { started_at_ms, last_seen_at_ms }`,
   `Missing`, or `Invalid` (present but failed HMAC verification).
2. If at least one source is `Valid`, the authoritative `started_at_ms` is
   the **earliest** of the valid sources — never the latest. This is the
   entire mechanism that closes the new-account gap: a fresh per-user
   Keychain anchor (`Missing`) can never outrank an older machine-wide
   anchor, because `Missing` sources never contribute a candidate value at
   all.
3. The rollback high-watermark (`last_seen_at_ms`) is the **latest** of the
   valid sources, so a rolled-back clock is still caught even if only one
   of the two anchors happened to record the more recent timestamp.
4. Only when **no** source is `Valid` does this fall back to the original,
   unchanged fail-safe behavior: forced-expired (`started_at_ms = 0`) if a
   present record failed verification with nothing to rescue it, or a
   genuinely fresh trial (`now`) if both are simply absent (true first
   launch, or first launch since both were cleared).
5. `load_or_start` then self-heals: any source whose stored value doesn't
   match the just-computed authoritative value gets rewritten — including
   seeding a not-yet-created shared anchor **from the existing Keychain
   anchor's original `started_at_ms`**, never from `now`. This is what
   makes the upgrade safe for every existing user: the very first time an
   existing installation runs this new code, its own already-in-progress
   trial's start time is copied into the new shared anchor unchanged, not
   reset.

### `tamper_detected` semantics (one real, deliberate change)

Previously, any HMAC verification failure on the single anchor forced
`tamper_detected = true` **and** `started_at_ms = 0` (immediate lockout) —
there was nothing else to fall back to. Now, with two independent anchors,
a verification failure on *one* of them no longer forces lockout **if the
other anchor is still valid**: `tamper_detected` is still reported as
`true` (so the existing Paywall UI copy, unchanged, still says what it
already said), but the trial continues using the surviving anchor's value
instead of being treated as instantly expired. This is a genuine
improvement, not a weakening: an attacker who corrupts one anchor to try to
reset their trial is simply bound to the other, older, correctly-signed
anchor instead — corrupting one side can only ever fail to help an
attacker, never grant them a fresh trial. Lockout still happens, exactly as
before, in the case that matters: when **no** anchor verifies at all.

### Permission and filesystem semantics — verified directly on a real Mac, not assumed

The task explicitly warned not to assume a world-writable location
provides tamper resistance or reliable cross-user writes. Rather than
assume, this was checked directly:

| # | Question | Finding |
|---|---|---|
| 1 | Cross-user read/write permissions on `/Users/Shared` | Verified via `ls -ld` / `stat`: `drwxrwxrwt`, mode **1777**, owner `root:wheel` — world-writable *and* the sticky bit is set. No `sudo`, no permission dialog, confirmed by actually creating and deleting a disposable file there as the current (non-root) user. |
| 2 | Can another user delete/replace a file they don't own? | **No.** The sticky bit (mode bit `01000`) is standard POSIX: in a sticky directory, only a file's own owner (or root) may delete or rename it, regardless of the directory's own write permissions. This was the specific mechanism `/tmp` itself relies on; `/Users/Shared` uses the identical mechanism. |
| 3 | Symlink / path-traversal protection | The path is a fixed constant (no user input, so no traversal is possible by construction). Creation uses `O_CREAT\|O_EXCL` (Rust's `create_new`), which fails immediately if *anything* — including a pre-planted symlink — already exists at that path, so a planted symlink is never followed on creation. Reads and in-place overwrites additionally check `symlink_metadata(..).file_type().is_file()` and refuse anything that isn't a plain regular file, and both use the `O_NOFOLLOW` open flag. Verified with a real test that plants a symlink to a decoy file first: both read and write correctly refuse it, and the decoy file is left untouched. |
| 4 | Atomic writes / concurrent first launches | `O_CREAT\|O_EXCL` is atomic at the kernel level: exactly one caller can ever win a race to create the file for the first time; every other caller gets `AlreadyExists` and falls through to the read-and-reconcile path instead of corrupting or racing the winner's write. Verified directly (a second `create_new` against an existing path reliably returns `AlreadyExists` without altering the existing content). |
| 5 | HMAC signature + earliest-valid-start reconciliation | Implemented exactly as recommended, reusing the unchanged `sign`/`verify`/`TRIAL_HMAC_KEY` from `trial.rs`. Nine new pure unit tests cover every source combination (both missing, one missing, both valid and disagreeing, one tampered, both tampered, idempotent-once-agreed). |
| 6 | Migration for existing users | The shared anchor is seeded from an *existing* Keychain anchor's own `started_at_ms` the first time this code runs for that user — never from `now`. Verified by a dedicated unit test (`reconcile_keeps_the_keychain_value_when_shared_anchor_is_not_yet_created`) asserting the reconciled value equals the pre-existing Keychain value exactly. **One real, deliberate side effect worth naming explicitly**: on a Mac that already has *multiple* macOS user accounts each independently mid-trial (today's exploitable state, pre-upgrade), the first of those accounts to run the new code seeds the shared anchor from *its own* start time; every other account on that Mac then gets bound to whichever of the two is earlier the next time *it* runs. For a legitimately shared household Mac with more than one honest trial already in progress, this can retroactively shorten (never lengthen) a second account's remaining trial time at the moment of upgrade. This is the direct, intended consequence of closing the gap — tightening, by construction, never grants less time than the gap being closed would otherwise have given away — but it is a real, user-visible, one-time transition effect worth knowing about rather than discovering by surprise. |
| 7 | Behavior when either record is missing, corrupted, or inaccessible | Covered by `reconcile`'s `Missing`/`Invalid` handling (table above) plus `write_raw`'s fail-open error handling — any filesystem error (permission denied, read-only filesystem, disk full) is logged and otherwise ignored; the Keychain anchor alone keeps governing exactly as it did before this feature existed. |
| 8 | Behavior when both records are missing | A genuinely fresh trial starts at `now`, and both anchors are created — identical to today's single-anchor first-launch behavior. Verified both by unit test and by the real end-to-end harness (step 1 below). |
| 9 | Can the shared record be copied between machines? | Yes, trivially — it's an ordinary file. This was already true of the Keychain anchor in spirit (nothing here is hardware-bound) and is **not a new abuse vector in the direction that matters**: because reconciliation always takes the *earlier* of the two `started_at_ms` values, copying an anchor from another Mac can only ever *shrink* the receiving Mac's remaining trial, never extend it. At worst this is a way to grief a friend's Mac, not a way to get free trial time. |
| 10 | Can a standard, non-admin macOS user create and read the record? | **Not empirically tested in this session** — this Mac has only one real local account (`dscl . -list /Users UniqueID` confirms it), and creating a second, throwaway macOS user account to test with requires an admin-password-gated account-creation step this task's safety rules didn't authorize taking unprompted. Reasoned from documented macOS semantics instead: the admin-vs-standard distinction governs software installation, System Settings panes, and TCC-gated folders (Documents, Desktop, Photos, etc.) — it does **not** change ordinary POSIX permission enforcement on a plain directory like `/Users/Shared`, which every local account (admin or standard) can read and write to identically on stock macOS. High confidence, but flagged honestly as not independently verified end-to-end with a real standard account — a cheap, final manual check worth doing once before shipping if 100% empirical certainty matters before release. |

### Real tests run (not just reasoning)

1. **Unit tests** — `shared_anchor.rs` gained 7 new tests (round-trip,
   overwrite-when-owned, forced world-readable permissions regardless of
   umask, missing-file handling, symlink refusal for both read and write,
   atomic-create-collision, path sanity). `trial.rs` gained 9 new tests for
   `reconcile` covering every source-state combination, plus a
   regression-guard test for the `SERVICE`/`ACCOUNT` constants
   (Recommendation 3). All run against real temp-directory paths on the
   real filesystem — never `/Users/Shared` itself, and never the real
   Keychain. **Result: 126/126 passing**, in both the default build and
   `--features dodo_test_mode`, with zero compiler warnings.
2. **Real, isolated end-to-end integration check** — per the task's
   instruction to test with isolated temporary paths and disposable
   Keychain service names rather than production ones, the Keychain
   service name was temporarily changed to
   `com.macbookcleaner.app.verify-test.trial` and the shared-anchor path
   was temporarily pointed at a disposable `/tmp` directory (both
   one-line, clearly-marked `TEMP-VERIFY-ONLY` edits), a disposable Cargo
   `examples/` binary exercised the real `trial::load_or_start` against
   real Keychain and real filesystem I/O, and every edit plus the example
   file itself was deleted afterward. Verified empirically, in this order:
   - First launch (both anchors absent) → fresh trial created, both
     anchors written. ✅
   - Keychain anchor cleared (simulating a brand-new macOS user account)
     while the shared anchor survives → the "new account" is bound to the
     **original, earlier** `started_at_ms`, not a fresh one. ✅ (this is
     the literal, real-world proof of the fix, not just a unit test of the
     pure logic)
   - The cleared Keychain anchor is **recreated** (self-healed) with the
     correct, rescued value on the very next read. ✅
   - Reverse direction: shared anchor file deleted, Keychain anchor
     survives → trial start is unaffected, and the shared anchor
     self-heals back into existence. ✅
   - Cleanup confirmed: the disposable Keychain item and the disposable
     `/tmp` directory were both removed, and the full test suite was
     re-run afterward (126/126 passing again) to confirm the temporary
     edits left no trace.
3. **Production-safety checks, run directly**: confirmed before and after
   this work that `/Users/Shared` contains no file matching this feature's
   name (nothing was ever written to the real production path during
   testing — the real end-to-end check used a disposable `/tmp` stand-in
   instead, precisely to avoid this), and that `security
   find-generic-password` for the real production service name
   (`com.macbookcleaner.app.trial` / `anchor`) finds nothing on this
   machine — consistent with this dev Mac never having run the real,
   shipped app's trial, and confirming no production Keychain item was
   created, read, or altered by this round of work.

### What remains possible after this change (be exact)

- **Deleting *both* the Keychain anchor and the `/Users/Shared` anchor**
  still produces a fresh trial. This is the one case Recommendation 1 was
  always explicit about not fully closing (see "What it does not fix" in
  the original audit above) — it raises the required skill from "delete
  one obvious thing" to "find and delete two things, one of them a hidden
  dotfile outside your own home folder," which is the intended, honest
  scope of this fix.
- **A full OS reinstall, or a different physical Mac**, still resets
  everything — unchanged, and out of scope by design (no hardware
  fingerprinting, per the user's own constraint).
- **Scenario 2 (shared license key)** is entirely unaffected by this
  round's change — it was already handled server-side by Dodo's own
  `activation_limit`, and nothing here touches license/activation logic at
  all, only the free-trial anchor.
- The one item not independently verified end-to-end is a true non-admin
  standard macOS account (see point 10 in the table above) — reasoned
  through with high confidence from documented OS semantics, not proven
  with a real second account in this session.

No code was committed, pushed, or deployed as part of this round.

---

## Final release QA (follow-up round)

A dedicated, final release-readiness pass over the entire trial + Dodo
licensing system, requested after the implementation record above was
complete. Scope: all 15 scenarios below. Nothing was committed, pushed,
deployed, or switched to Dodo Live Mode. No production Keychain record,
existing user trial record, or the HMAC signing key was altered — every
real-flow check below used the same disposable Keychain service name
(`com.macbookcleaner.app.verify-test.trial`) and a disposable `/tmp`
filesystem path, never the production `com.macbookcleaner.app.trial` /
`/Users/Shared` locations, with every temporary edit and harness file
deleted immediately after verification (confirmed by re-running the full
126-test suite in both feature configs afterward, and by confirming
`security find-generic-password` for the real production service name and
`ls /Users/Shared` both still show nothing — meaning this dev Mac has
never had a real production trial record, and this round didn't create
one either). No further architecture changes were made — this was a
verification pass only; no reproducible release-blocking defect was found.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Fresh installation starts exactly one 48-hour trial | **PASS** | Real harness, via the actual `license_get_state` Tauri command: `status=Trial`, `trial_ends_at_ms - trial_started_at_ms == 172,800,000` (exactly 48h), `remaining_ms` ≈ 48h, `tamper_detected=false`. |
| 2 | Normal uninstall/reinstall does not reset the trial | **PASS** (carried over) | Keychain items are independent of the app bundle's lifecycle on macOS — already verified empirically in `dodo-sandbox-integration-report.md` Phase 6b. The new `/Users/Shared` anchor is equally independent of the app bundle (it isn't inside it), so this holds unchanged. |
| 3 | Deleting only the isolated Keychain anchor restores the original trial from the shared anchor | **PASS** | Real harness: cleared the disposable Keychain item only, called `license_get_state`, got back the exact original `trial_started_at_ms` (not reset), and confirmed the Keychain anchor was self-healed (recreated) on that same call. |
| 4 | Deleting only the isolated shared anchor restores it from Keychain | **PASS** | Real harness: deleted the disposable shared-anchor file only, called `license_get_state`, got back the exact original `trial_started_at_ms`, and confirmed the shared-anchor file was self-healed (recreated) on that same call. |
| 5 | Creating a second macOS user does not grant a new trial | **PASS (simulated) — NOT EMPIRICALLY VERIFIED WITH A REAL SECOND ACCOUNT** | This Mac has exactly one real local account (`dscl . -list /Users UniqueID` confirms it); creating a genuine throwaway second account requires an admin-password-gated step that wasn't taken without explicit authorization. Simulated instead by clearing the per-account Keychain anchor while leaving the shared anchor intact — functionally identical to what a brand-new account would observe (no Keychain item of its own, shared anchor readable) — and confirmed the simulated "new account" inherits the original, earlier `started_at_ms` rather than getting a fresh trial. Flagged exactly as the task requested: real-second-account coverage is reasoned from verified mechanics (POSIX permissions don't distinguish admin/standard accounts on a plain directory), not independently proven end-to-end. |
| 6 | Trial expiration correctly restricts premium features | **PASS** | Backend: real harness backdated both anchors to 49h ago (past the 48h window) and confirmed `license_get_state` returns `status=TrialExpired`, `remaining_ms=0`. Frontend: verified directly in `src/features/license/types.ts` (`isLocked` includes `'trial_expired'`) and `src/components/layout/AppShell.tsx` (when locked, renders *only* `<Paywall/>` — the sidebar, all routes, and the rest of the app are not mounted at all, not just visually hidden). |
| 7 | A purchased Dodo license unlocks premium features | **PASS** (carried over) | Verified for real against the sandbox API in earlier rounds (see `dodo-sandbox-integration-report.md`); `dodo.rs`/`mod.rs`'s activation logic is unchanged this round. |
| 8 | One license key cannot simultaneously activate two Macs through Dodo | **PASS** (carried over) | Real `422 LICENSE_KEY_LIMIT_REACHED` verified against the sandbox API in an earlier round; unaffected by this round's change. |
| 9 | License activation survives application restarts | **PASS** (carried over) | Real isolated-Keychain-namespace harness in an earlier round (`dodo-sandbox-integration-report.md` Phase 6b) confirmed restart persistence of `Licensed` state; unaffected by this round's change. |
| 10 | Deactivation releases the device slot | **PASS** (carried over) | Real deactivate-then-reactivate-on-a-different-device-id sequence verified against the sandbox API in an earlier round; unaffected by this round's change. |
| 11 | Offline grace-period rules behave correctly | **PASS** (carried over) | Real 15-day backdate of `last_validated_at_ms` verified to produce `LicensedGraceExpired` in an earlier round (Phase 6b); `OFFLINE_GRACE_MS` and the grace-period math are unchanged this round. |
| 12 | App updates preserve trial and license information | **PASS** | Neither anchor is tied to the app binary's path or version. Newly regression-guarded this round: `service_and_account_names_are_regression_guarded` (trial) and `license_service_and_account_names_are_regression_guarded` (license) assert the exact Keychain service/account string literals, so a future accidental rename — the one realistic way an update could silently reset state — now fails a test immediately instead of shipping. |
| 13 | Shared-anchor file permissions and security protections work in the packaged application | **PASS** | Built the real, signed `.app` (+ DMG) via `tauri build` and inspected its actual embedded entitlements directly with `codesign -d --entitlements :-`: confirmed **no `com.apple.security.app-sandbox` entitlement** — the packaged, hardened-runtime binary has the same unrestricted POSIX file access as the dev build, which already has 7 passing unit tests proving atomic creation, forced `0644` permissions regardless of umask, and symlink refusal on both read and write. The production-identified binary itself was deliberately not launched, to avoid creating any real production Keychain/trial record (see the task's explicit instruction) — the entitlements check plus the already-proven file-I/O mechanics together are the evidence for this result. |
| 14 | No trial-related file operations introduce crashes, data loss, or unexpected permission prompts | **PASS** | Crashes: reviewed every non-test `unwrap()`/`expect()`/`panic!` in `trial.rs`/`shared_anchor.rs` directly — `shared_anchor.rs` has none outside tests; `trial.rs`'s two `.unwrap()` calls in `reconcile` are reachable only after a preceding `is_empty()` guard proves the collection is non-empty, and are covered by 9 passing tests exercising every source combination. Data loss: every write is atomic-create-or-owned-overwrite with symlink refusal (verified by dedicated tests). Permission prompts: `/Users/Shared` is not among macOS's TCC-protected folders (Documents, Desktop, Downloads, Photos, etc.), and the real packaged app carries no sandbox entitlement (see #13) — no OS mechanism exists here that would trigger a prompt. Not independently confirmed via a live Console.app observation of the real production binary, for the same reason given in #13. |
| 15 | Existing users are migrated safely without receiving a new trial or losing remaining trial time | **PASS** | Real harness: seeded a Keychain-only anchor representing a trial already 10 hours in progress (simulating an installation from before this feature shipped), with no shared anchor present, then ran the new code — confirmed `license_get_state` reports the exact pre-existing `trial_started_at_ms` (not reset to "now") and confirmed the shared anchor was seeded from that same existing value. Also covered by the unit test `reconcile_keeps_the_keychain_value_when_shared_anchor_is_not_yet_created`. |

### Full-suite checks run this round

- **Rust**: `cargo test --lib` — **126/126 passing**, both the default build
  and `--features dodo_test_mode`, zero compiler warnings.
- **TypeScript**: `tsc -b` — clean, no errors.
- **Frontend lint**: `oxlint` — zero new warnings; every warning present is
  pre-existing and in files unrelated to the license/trial feature
  (marketing site hooks, cleanup-flow components, etc.).
- **Localization**: all 16 locale files checked for key parity against
  `en.json`. Zero license-related keys missing beyond the expected,
  CLDR-correct absence of `_one` plural forms in Japanese, Korean, and
  Chinese (confirmed these locales correctly define `_other` instead,
  matching how `react-i18next` resolves plurals for languages with no
  singular/plural distinction — not a bug).
- **Production build**: `npm run tauri:build` — succeeded, produced a
  real signed `MacBook Cleaner.app` (ad-hoc signed, hardened runtime) and
  a DMG; notarization was skipped only because no Apple credentials are
  configured in this environment (pre-existing, known limitation, not new).

### What this round did not change

No reproducible release-blocking defect was found, so — per the task's own
instruction — no further architecture changes were made. The one
not-fully-closeable item (new-account protection without a real second
macOS account to test against) was already known and is stated plainly in
row 5 above, not something a code change in this environment could resolve.

---

## Summary

- Scenario 1's real gap was **new macOS user account**; this has now been
  **implemented, tested, and verified for real** (see the implementation
  record above) at zero new friction, zero new privacy surface, and zero
  new infrastructure, exactly as Recommendation 1 proposed. The residual
  gap is narrower than before: an attacker now needs to find and delete
  two separate, independently-stored records instead of one.
- Scenario 2 is **already well-protected** by Dodo's own server-side
  activation limit; the one real residual gap (deactivate-then-air-gap) is
  narrow, bounded to 14 days, requires deliberate sustained effort, and is
  a direct, quantified consequence of the offline grace period — a known
  trade-off, tunable via `OFFLINE_GRACE_MS`, not a bug. Unaffected by this
  round's change.
- A Cloudflare Worker + D1 registry remains **not recommended** given the
  user's own constraints (no accounts, no hardware fingerprinting) — it
  would add real cost without closing any gap the cheaper, local fix
  implemented here doesn't already close.
