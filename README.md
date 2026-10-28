# MacBook Cleaner

Safe, local-first storage cleanup for macOS. Tauri v2 + React + TypeScript, with a native Rust scanning/cleanup layer.

MacBook Cleaner is a separate product built on the proven native layer of Mac Storage Manager (that project is untouched). It has its own bundle id (`com.macbookcleaner.app`), state directory, LaunchAgent labels, logs and website.

## Run

```bash
npm install
npm --prefix web install

npm run dev              # official marketing website at http://localhost:5180
npm run web:dev          # same explicit website command
npm run desktop:preview  # desktop UI in a browser at http://localhost:1420; DEMO/sample data only
npm run tauri:dev        # real desktop app with live macOS data
npm run desktop:build    # desktop frontend only → dist/
npm run tauri:build      # Tauri bundles using the desktop frontend
npm run icons        # re-render the app icon from src-tauri/icons/source/icon.svg (needs Google Chrome)
```

The root `npm run dev` and `npm run build` commands belong to the official `web/` marketing site. Tauri is pinned to the separate `desktop:preview` and `desktop:build` scripts in `src-tauri/tauri.conf.json`, so the two applications cannot be confused by their normal commands. The superseded `website/` folder is retained only as source history and is not used by any script or deployment.

### Running a demo or manually testing the trial/license flow

`npm run tauri:dev` on its own uses your **real production** Keychain
trial/license records, the real `/Users/Shared` anchor, and the real
**live** Dodo API — exactly what a real user's Mac would do. For a demo,
screenshot, or any manual click-through of Buy/Activate/Deactivate that
should never touch your real trial/license state or the live Dodo API,
pass both of these Cargo features together:

```bash
npm run tauri:dev -- -f demo_identity -f dodo_test_mode
```

`demo_identity` **requires** `dodo_test_mode` — enabling it alone is a
compile error, on purpose. Isolating the Keychain/shared-anchor storage
without also isolating which Dodo API it talks to would still let a demo
send real activate/validate/deactivate calls to production.

This builds against an entirely separate Keychain namespace
(`com.macbookcleaner.app.demo.*` instead of `com.macbookcleaner.app.*`) and
an isolated shared-anchor path under the OS temp directory instead of the
real `/Users/Shared` — see `src-tauri/src/license/trial.rs`, `mod.rs`, and
`shared_anchor.rs`. It is **never** selected by accident: `demo_identity`
is not in `default`, requires `dodo_test_mode` at compile time, and
refuses to compile at all if combined with `--release` — so it
structurally cannot ship and structurally cannot talk to the live Dodo API.

Toggling between a normal dev run and a demo run is a command-line flag,
never a source-file edit — `tauri dev`'s own file watcher rebuilds on any
change to `src-tauri/`, so editing a Keychain identifier by hand while it's
running can cause an in-between rebuild to briefly run with the *wrong*
identity. Always use the `-f demo_identity` flag instead of hand-editing
these constants.

Rust tests (safety rules, duplicate detection, uninstall validation, scheduler):

```bash
cd src-tauri && cargo test
```

Requires Node 20+ and Rust (`rustup`). If `cargo` isn't on your PATH: `export PATH="$HOME/.cargo/bin:$PATH"`.

## Layout

| Path | What |
|---|---|
| `src-tauri/src/` | Native layer. `trash.rs` is the single gate every removal passes (canonicalize → home-scoped → protected-path denylist → sensitive-keyword check → move to Trash). `app_footprint.rs` handles app leftovers, icons and the separately-validated uninstall. `auto_clean.rs` is the strict allowlist for unattended cleaning. |
| `src/services/` | `StorageService` interface with Tauri (real) and Mock (preview) implementations. `tauri/classify.ts` turns raw scan data into Safe / Review / Protected items. |
| `src/lib/smartClean.ts` | Smart Clean grouping and default selection rules. |
| `src/components/cleanup/CleanupFlow.tsx` | The one confirm → progress → result flow every removal in the UI goes through. |
| `src/routes/` | One file per screen. |
| `src/features/performance/` | Performance tab (CPU, memory, running apps, battery, Mac info). Native side in `src-tauri/src/perf/`; polls only while the screen is visible. |
| `website/` | Old static landing page (superseded by `web/`). |
| `web/` | Marketing website — React + Vite, prerendered. See `web/README.md`. |

## macOS DMG releases

```bash
npm run dmg:native       # current Mac architecture; ad-hoc development signature
npm run dmg:arm64        # aarch64-apple-darwin
npm run dmg:intel        # x86_64-apple-darwin (requires that Rust target)
npm run dmg:universal    # both architectures (requires both Rust targets)
npm run dmg:production   # Developer ID + notarization credentials required
```

Successful, inspected artifacts are copied to `release/MacBook-Cleaner-<version>-<architecture>.dmg` with a SHA-256 file. Development DMGs are explicitly reported as ad-hoc and are not accepted by the website's production deployment check. See [`docs/distribution.md`](docs/distribution.md) for signing, notarization, download verification and Firebase deployment steps.

## Safety model

- Nothing is permanently deleted. Everything goes to the Trash; the app never empties it.
- Personal files (Downloads, Desktop, Documents, Movies) are never preselected and always need explicit confirmation.
- Protected items (system paths, the home folder and its top-level folders, anything that looks like a backup, keychain or key) are refused natively, whatever the UI sends.
- Uninstall only accepts a `.app` directly inside `/Applications` or `~/Applications`, never Apple apps or MacBook Cleaner itself.
- Scheduled auto-clean only touches a fixed list of developer caches, needs explicit consent, and is capped per run.
