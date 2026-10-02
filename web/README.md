# MacBook Cleaner — website

Marketing site for the MacBook Cleaner desktop app. React + TypeScript + Vite, prerendered to static HTML per page (real content, titles, Open Graph and JSON-LD in every file), then hydrated. Fully separate from the desktop app — its own `package.json`, nothing in `../src` or `../src-tauri` is imported.

## Run

```bash
cd web
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck → client build → SSR build → prerender into dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run og         # re-render public/og-image.jpg from scripts/og/og-image.html (needs Google Chrome)
```

Deploy `dist/` to any static host. `../firebase.json` is set up for Firebase Hosting (`firebase deploy --only hosting` builds first). Pages are emitted as flat files (`features.html`, `privacy.html`, …) so `/features` works on Firebase (`cleanUrls`), Vercel (`cleanUrls`), Netlify, Cloudflare Pages and GitHub Pages; the app's own links to `/privacy.html` and `/terms.html` resolve too. Unknown URLs get `404.html`.

## Mac installer download

`npm run build` (and `npm run dev`) first runs `scripts/prepare-installer.mjs`, which:

1. finds the DMG for the version in `../src-tauri/tauri.conf.json` in `../src-tauri/target/release/bundle/dmg/` (build it with `npm run tauri:build` in the project root);
2. mounts it read-only and checks the app inside — version, architectures (`lipo`), signature (`codesign`) and notarization (`stapler`);
3. copies it to `public/downloads/MacBook-Cleaner-<version>-<arch>.dmg` and writes `src/config/installer.generated.json`.

Every Download button reads the link, file name, size and checksum from there via `src/config/site.ts`. A production build **fails** if no installer is found and `VITE_MAC_DOWNLOAD_URL` isn't set, so a broken download can't ship. After releasing a new app version: rebuild the app, then rebuild and redeploy the site.

## Configuration

Everything environment-specific lives in **`src/config/site.ts`**, fed by `VITE_*` variables (see `.env.example`). Values are baked in at build time.

| Variable | Purpose |
|---|---|
| `VITE_MAC_DOWNLOAD_URL` | Optional. Host the DMG elsewhere (e.g. a GitHub Release asset). Empty → the site serves the verified DMG itself at `/downloads/`. |
| `VITE_RELEASE_DATE` | Optional public release date for the Download page and Release Notes. |
| `VITE_SITE_URL` | Origin for canonical URLs, Open Graph and `sitemap.xml`. |
| `VITE_SUPPORT_EMAIL`, `VITE_PRIVACY_EMAIL` | Contact addresses. |

The app version and minimum macOS version are read from `../src-tauri/tauri.conf.json` at build time. Supported architectures and notarization status are read from the actual DMG by `prepare-installer.mjs`, so the Download page, FAQ and Gatekeeper help always match the file being offered.

## Content rules

Every feature, privacy statement and FAQ answer was checked against the desktop app's source. When the app changes — especially anything touching the network, analytics, updates or what gets deleted — update `src/data/*` and `src/pages/Privacy.tsx` before shipping. Demo numbers (`src/data/storage.ts`) mirror the app's sample data and are always labeled as illustrative.

## Layout

```
src/
  config/site.ts      URLs, emails, legal placeholders, download config
  data/               features, FAQ, changelog, SEO metadata, demo storage numbers
  components/         Navbar, Footer, FeatureCard, DownloadButton, FAQAccordion,
                      SectionHeading, AppPreview, StorageVisualization, LegalLayout, …
  sections/           Home page sections (Hero, ScanDemo, SafeCleaning, BeforeAfter, …)
  pages/              One file per route
  hooks/              useInView, useDocumentMeta, useReducedMotion, …
  styles/             tokens.css (light/dark), base, components, sections, pages
  entry-client.tsx    hydrate (or render in dev)
  entry-server.tsx    renderToString + head tags for the prerenderer
scripts/prerender.mjs writes dist/*.html, 404.html, sitemap.xml, robots.txt
public/screens/       real screenshots of the app (captured with its sample data)
```
