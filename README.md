# MacBook Cleaner

Safe, local-first storage cleanup for macOS. Tauri v2 + React + TypeScript, with a native Rust scanning/cleanup layer.

MacBook Cleaner is a separate product built on the proven native layer of Mac Storage Manager (that project is untouched). It has its own bundle id (`com.macbookcleaner.app`), state directory, LaunchAgent labels, logs and website.

## Run

```bash
npm install
npm run dev          # browser preview at http://localhost:1420 (realistic sample data, nothing on disk is touched)
npm run tauri:dev    # real desktop app with live macOS data
npm run tauri:build  # release bundle → src-tauri/target/release/bundle/
npm run icons        # re-render the app icon from src-tauri/icons/source/icon.svg (needs Google Chrome)
npm run website      # serve the marketing site from website/ on http://localhost:4173
```

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

## Safety model

- Nothing is permanently deleted. Everything goes to the Trash; the app never empties it.
- Personal files (Downloads, Desktop, Documents, Movies) are never preselected and always need explicit confirmation.
- Protected items (system paths, the home folder and its top-level folders, anything that looks like a backup, keychain or key) are refused natively, whatever the UI sends.
- Uninstall only accepts a `.app` directly inside `/Applications` or `~/Applications`, never Apple apps or MacBook Cleaner itself.
- Scheduled auto-clean only touches a fixed list of developer caches, needs explicit consent, and is capped per run.
