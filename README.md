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
