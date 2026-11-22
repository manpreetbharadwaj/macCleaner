# Deploying the website to Cloudflare Pages (macbookcleaner.com)

Preparation only — **nothing was deployed, published, or pointed live by
this round**. Everything below was verified against a real local build;
the actual Cloudflare project and DNS records still need to be created by
you (I have no access to your Cloudflare or Hostinger accounts).

## Fixing "it's serving the desktop app instead of the website"

**Root cause, confirmed by direct inspection — this is a Cloudflare
dashboard setting, not a repository bug.** This repo has two completely
separate Vite projects: the repo root (`vite.config.ts` + root
`package.json`) builds the **desktop app's** React frontend into a root
`dist/`; `web/` is the actual, self-contained marketing site with its own
`package.json`, builds into `web/dist`. I confirmed there is no Cloudflare
Worker config (`wrangler.toml`, `_worker.js`) anywhere in the repo that
could cause this on its own, and that the `web/` build itself is correct
(rebuilt it fresh and inspected every requested page's actual HTML — real
titles and real marketing copy, not the desktop app's `<div id="root">` +
`/src/main.tsx` shell).

The only way to get the desktop dashboard out of a static deploy of this
repo is for the build to have run **at the repo root** instead of inside
`web/` — almost always because Cloudflare Pages' "Connect to Git" flow
auto-detects a framework (it finds the root `vite.config.ts` before you
ever get to the Root Directory field) and pre-fills a build command/output
directory for the **root** project, and the **Root Directory** field was
left at its default (the repo root) rather than set to `web`.

**The fix**, in the Cloudflare dashboard: your Pages project → **Settings
→ Builds & deployments** → set **Root directory** to `web` (not blank, not
`/`) → **Build command** to `npm run build` → **Build output directory**
to `dist` (this resolves relative to the Root directory you just set, so
it becomes `web/dist`, not the repo-root `dist/`) → **Save** → trigger a
new deployment (Deployments tab → ⋯ on the latest one → **Retry
deployment**, or just push a commit).

**After redeploying, verify it worked** by viewing the live page's source
(not the rendered page — "View Page Source" or `curl` the homepage) and
confirming it does **not** contain `<div id="root">` immediately followed
by a `<script type="module" src="/src/main.tsx">` tag — that exact
combination is the desktop app's shell. The real website's homepage has
full marketing HTML already in the initial response (it's prerendered),
not an empty mount point.

## What changed this round

- `web/src/config/site.ts`: production URL default changed from
  `macbookcleaner.app` to **`macbookcleaner.com`**; `hostingProvider` /
  `downloadHost` updated to Cloudflare Pages (shown on the Privacy page).
- Every page's canonical URL, `og:url`, `og:image`, `sitemap.xml`, and
  `robots.txt` — all derive from that one config value, re-verified in a
  real build (shown below), not just reasoned about.
- `web/.env.example` comments updated to match.
- `web/public/_headers` — new. Cloudflare Pages reads this automatically;
  sets cache policy for `/downloads/*` and `/updates/*` and baseline
  security headers.
- **Desktop app files also updated** (confirmed with you before doing
  this, since it crosses outside "website-only" scope): the security
  allowlist in `external_url.rs` (now permits both `.com` and `.app` —
  never a reason a legitimate link breaks), the post-purchase
  `THANK_YOU_URL`, Settings' Privacy/Terms `SITE` constant, and the
  updater's manual-download fallback link. All pure domain-string
  changes — no logic touched. Corresponding Rust tests updated to match
  and re-verified passing (131/131, all three feature configs).

## Verified in a real build (not assumed)

```
sitemap.xml  → https://macbookcleaner.com/
robots.txt   → Sitemap: https://macbookcleaner.com/sitemap.xml
<link rel="canonical" href="https://macbookcleaner.com/">
<meta property="og:url" content="https://macbookcleaner.com/">
<meta property="og:image" content="https://macbookcleaner.com/og-image.jpg">
```

The only remaining `macbookcleaner.app` strings anywhere in the built
`dist/` are the macOS **bundle identifier** `com.macbookcleaner.app`
(e.g. `~/Library/Logs/com.macbookcleaner.app/`, mentioned in the FAQ/
Privacy/Support pages when explaining where log files live) — that is
correct and must never change; it's unrelated to the website domain.

## Cloudflare Pages project settings (exact)

| Setting | Value |
|---|---|
| Framework preset | None / Vite (either works — the build command below is explicit either way) |
| Root directory | `web` |
| Build command | `npm run build:release` (strict — see note below) |
| Build output directory | `dist` (resolves to `web/dist` because of the root directory above) |
| Node version | 20 (set `NODE_VERSION=20` as an environment variable, or add a `.nvmrc`/`engines` field if you want it pinned in-repo) |

**Important about the build command**: `npm run build:release` sets
`REQUIRE_INSTALLER=1`, which makes the build **fail** unless a verified,
Developer-ID-signed, notarized DMG is available (`scripts/verify-download.mjs`
refuses anything else — this is intentional, confirmed in an earlier
round's audit). Since no notarized DMG exists yet, **use `npm run build`
(not `build:release`) for now** — it gracefully shows the Download page as
"not yet available" instead of failing the whole deployment. Switch to
`build:release` once a real signed DMG is hosted (see below).

Cloudflare Pages' build environment is **Linux**, not macOS — confirmed by
reading `prepare-installer.mjs`: its macOS-only tooling (`hdiutil`,
`codesign`, `lipo`, `xcrun stapler`) only runs in the branch where a local
DMG file is actually found, and Cloudflare's fresh checkout never has one
(DMGs are gitignored, never committed) — so it safely takes the "no DMG
found" path and never invokes anything Linux doesn't have. This is already
true of the existing code; nothing needed to change for that.

### Environment variables to set in the Cloudflare Pages dashboard

```
VITE_SITE_URL=https://macbookcleaner.com
```
(Technically redundant now that it's the compiled-in default, but setting
it explicitly means the site is still correct even if that default ever
changes again later — defense in depth, costs nothing.)

Leave `VITE_DODO_CHECKOUT_URL` and `VITE_MAC_DOWNLOAD_URL` **unset** for
now — see the next two sections for exactly why and when to set them.

## Keeping Dodo checkout disabled (your requirement #6)

Already the default, reconfirmed: with `VITE_DODO_CHECKOUT_URL` unset,
`PURCHASE.isSandbox` is `true` and the Pricing page's Buy button renders
**genuinely disabled** (not just annotated — this was a real bug fixed in
an earlier round) with a "not available yet" message. Do not set this
Cloudflare env var until you have a real Dodo **Live Mode** product and
its real checkout URL — see `docs/dodo-live-mode-checklist.md` for the
exact remaining steps.

## Preparing for the Universal DMG (your requirement #7)

A real universal DMG was built and verified this round:
`release/MacBook-Cleaner-1.0.0-universal.dmg` (17 MB, confirmed via
`lipo -info` to contain both `x86_64` and `arm64`). It is **ad-hoc signed,
not notarized** — per your Phase instructions, I have not published this
anywhere and am not treating it as a final release artifact.

To actually offer it for download once you're ready:
1. Upload the DMG somewhere public over HTTPS (options: host it with the
   site itself by committing it under `web/public/downloads/` — adds ~17
   MB to the git repo, simplest; or a GitHub Release asset on this same
   repo; or Cloudflare R2). Not done by me — this is the "publish a
   release" step you asked to keep manual.
2. Set `VITE_MAC_DOWNLOAD_URL` (Cloudflare env var) to that file's real
   HTTPS URL if hosted externally, or leave it unset and commit the DMG
   under `web/public/downloads/` for the "hosted with the site" path —
   either way, `prepare-installer.mjs` already validates the URL is
   https, isn't localhost, and ends in `.dmg`.
3. The Download page already, correctly, shows the "not notarized by
   Apple yet" disclosure (`!APP.notarized` block, pre-existing, reconfirmed
   intact) with exact Gatekeeper "Open Anyway" instructions — your
   requirement #8 was already satisfied before this round; nothing needed
   to change there.

## Preparing the update manifest hosting (your requirement #9)

The updater endpoint (`tauri.conf.json`) now points at
`https://macbookcleaner.com/updates/{target}/{arch}/{current_version}`.
**Nothing is hosted there yet** — I am not claiming the auto-update
mechanism works end-to-end (see the implementation-report from the prior
round: real testing of the install step was blocked by a safety
classifier, not completed). To actually make updates available once
you're ready to publish a new version:
1. Run `npm run release <version> universal` (prepared this round,
   requires `TAURI_SIGNING_PRIVATE_KEY`/`_PASSWORD` env vars pointing at
   the keypair generated in the prior round, stored outside the repo at
   `~/.tauri-keys/`).
2. Upload the resulting `.tar.gz` and the generated
   `release/update-manifest.json` to the exact path pattern your endpoint
   expects (e.g. commit the manifest content, reshaped per-version, under
   `web/public/updates/darwin/aarch64/<old-version>` for each version
   you want to be able to update *from* — this is manual publishing by
   design, not automated).
3. The `_headers` file already added this round gives the manifest a
   short cache (5 minutes) so new releases are seen promptly, while the
   artifact files themselves get a long, immutable cache.

## Direct-access / refresh for prerendered pages (your requirement #5)

No extra Cloudflare config needed — verified by how the build actually
works: this is **not** a single-page app relying on a catch-all fallback;
`npm run web:build` prerenders a real, separate `.html` file per route
(`pricing.html`, `download.html`, etc. — confirmed by listing `web/dist/`
directly). Cloudflare Pages' documented default static-asset behavior
serves `/pricing.html` for a request to `/pricing` automatically, and
serves this build's own `404.html` for anything unmatched. Both direct
navigation and a hard refresh hit a real file either way.

## Secrets / source-leak check (your requirements #11, #12)

- Scanned the actual `web/dist/` output directly: zero `.md`/`.rs`/`.toml`
  files, zero `node_modules`, zero `.env*` files, zero private-key-shaped
  strings. 59 files, 24 MB total — just the site.
- The desktop app's source (`src-tauri/`, `src/`), and every internal
  `docs/*.md` audit document, live **outside** `web/`. Setting Cloudflare
  Pages' **Root directory to `web`** and **Build output directory to
  `dist`** means only `web/dist`'s contents are ever uploaded to
  Cloudflare's edge — the rest of the monorepo is cloned into the build
  container (unavoidable for any CI on a monorepo) but never published.
  This is the exact, real mechanism that prevents requirement #12, not
  just a convention — get those two settings right and the rest of the
  repo structurally cannot leak.
- The updater's private signing key was never near the repository (generated
  to `~/.tauri-keys/`, confirmed by `.gitignore` coverage and a direct
  path check in the prior round) and nothing in this round changed that.

## Hostinger DNS → Cloudflare Pages

Exact steps (Cloudflare Pages' own custom-domain flow, generic to any
registrar — I don't have access to do this for you):

1. In the Cloudflare dashboard, create the Pages project (settings above),
   deploy once so it has a `*.pages.dev` URL.
2. In that Pages project → **Custom domains** → add `macbookcleaner.com`
   (and `www.macbookcleaner.com` if you want both).
3. Cloudflare will show you the exact DNS record(s) to add — normally a
   `CNAME` record for the root (Cloudflare supports "CNAME flattening" at
   the apex, which standard DNS doesn't normally allow) pointing at your
   project's `*.pages.dev` hostname.
4. In **Hostinger's** DNS management for this domain, add that record
   exactly as Cloudflare shows it. (If you move the domain's nameservers
   to Cloudflare entirely — Cloudflare will offer this — DNS management
   moves to Cloudflare's dashboard instead of Hostinger's; either approach
   works, the nameserver move is usually simpler for a Cloudflare Pages +
   Cloudflare DNS setup.)
5. Wait for DNS propagation (minutes to a few hours), then Cloudflare
   issues an HTTPS certificate for the domain automatically — no manual
   certificate work needed.

I cannot perform steps 1–4 myself (no access to either account).

## Final checklist

- [x] Production domain updated everywhere in the website build (verified).
- [x] Desktop app's hardcoded domain references updated to match (confirmed with you first).
- [x] `_headers` file added for cache policy.
- [x] Confirmed no secrets/source leak into the deployable output.
- [x] Confirmed Dodo checkout stays disabled by default.
- [x] Real universal DMG built and lipo-verified.
- [ ] You: create the Cloudflare Pages project with the settings above.
- [ ] You: add the DNS record at Hostinger (or move nameservers to Cloudflare).
- [ ] You: decide where the DMG will actually be hosted, then set `VITE_MAC_DOWNLOAD_URL` or commit it under `web/public/downloads/`.
- [ ] You: decide when to switch the build command to `build:release` (only once a real notarized DMG exists).
- [ ] You + me (together, later): finish verifying the updater's real install cycle (blocked on a safety-classifier permission in the prior round) before relying on it.

Nothing was committed, pushed, deployed, or published. Dodo was not switched to Live Mode. No payment was enabled.
