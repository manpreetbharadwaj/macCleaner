# Website internationalization — architecture & decisions

Covers `web/` only. The desktop app's own localization (if any) and its trial/licensing/update behavior are untouched by this work.

## Languages

16 locales: `en` (default, unprefixed), `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `tr`, `ru`, `ja`, `ko`, `zh-CN`, `hi`, `ar`, `id`. Defined in `web/src/i18n/locales.ts` (`LOCALES`), each with an `englishName`, a `nativeName` (shown in the switcher), a text `dir`, and a `ready` flag.

`ready: false` is the escape hatch for adding a 17th language later, or temporarily pulling one that turns out broken, without touching routing/SSR code: `ACTIVE_LOCALES`/`ACTIVE_LOCALE_CODES` (derived from `ready`) are the only things routing, the switcher, hreflang generation and the sitemap ever look at. All 16 are currently `ready: true`.

## URL structure

- English is canonical and unprefixed: `/features`, `/pricing`, … — identical to every URL this site had before this work, so no existing link, bookmark or search-indexed page breaks.
- Every other locale is prefixed: `/de/features`, `/ja/pricing`, `/zh-CN/download`, …
- `/` itself is a language-neutral entry point: crawlers always see the real English homepage there (SSR/prerendering never redirects — see below); a returning visitor's browser may bounce them client-side to their own language's homepage.
- Both route trees (`routes.tsx`) share the exact same page-component list, so adding/removing/editing a page only ever happens in one place.

## Language detection & persistence priority

Implemented in `web/src/i18n/detect.ts` and `web/src/components/LocaleLayout.tsx`, exactly in this order:

1. **Explicit URL** — visiting `/de/...` directly always wins, for that request, no matter what. It also gets saved as the preference for future visits to the bare domain (rule 2 below then applies to the *next* visit).
2. **Saved preference** (`localStorage: mbc-locale`) — if the visitor has one (from switching languages manually, or from visiting an explicit localized URL before), landing on *any* unprefixed page redirects (client-side, `replace`) to that language's version of the same page. This is deliberately scoped wider than rule 4 (every page, not just `/`), because an explicit saved choice is a stronger signal than a first-time guess.
3. **Browser language** (`navigator.languages`, already ordered by the user's own preference) — read in `detectBrowserLocale()`. Never a spoofable server header; never an IP/country guess (see below).
4. **Country-based suggestion — deliberately not implemented.** The task explicitly allowed skipping this if a Cloudflare edge integration would be disproportionate, and it would be here: this site is served as plain prerendered files via **Cloudflare Workers Static Assets with no Worker script in front of it** (confirmed in `docs/cloudflare-pages-deployment.md`'s "Workers Static Assets, not Pages" section). `request.cf.country` is only readable from inside an actual Worker `fetch` handler — a static-assets-only deployment never runs one, so there is no mechanism (short of adding a new Worker purely for this) for either the server or client JS to see it. Adding one just for a best-effort locale guess, on top of step 3 already covering the overwhelming majority of real visitors, was judged not worth the operational complexity (a new moving part in the deployment, another thing that can break independently of the static site). If this project ever gains a real edge Worker for another reason, revisit this.
5. **English fallback** — if nothing above matched, the visitor stays on the unprefixed English page they landed on.

Only step 4 was skipped; steps 1, 2, 3 and 5 are all implemented and exercised by `LocaleLayout`'s mount effect, which — critically — only ever runs client-side, after hydration. **SSR/prerendering never performs a language redirect**: a crawler, link-preview bot or `curl` hitting `/` always gets the real, complete English homepage, never a 30x or an empty shell. This is what keeps the homepage SEO-safe per the task's "no SEO-damaging forced redirects" requirement.

"Reset to automatic" (in the language switcher) clears the saved preference and re-runs step 3 immediately, without writing a new saved preference — so the *next* visit is detected fresh again rather than being silently stuck on whatever "automatic" resolved to this time.

## Rendering: fresh i18next instance per request, not a shared singleton

`web/src/i18n/createI18n.ts` creates a brand-new `i18next` instance for every `renderPage(url)` call. `scripts/prerender.mjs` calls this once per (route × locale) pair — 160 times in one Node process for the current 10 routes × 16 locales — so a shared/global i18next instance would leak one page's language into the next page's render. The client creates exactly one instance at boot (`entry-client.tsx`) and reuses it for the session; switching languages calls `i18n.changeLanguage()` on that same instance after lazily fetching the target locale's resource bundles (`addLocaleToInstance`), so a language switch never reloads the page.

Every instance also loads English as a `fallbackLng` bundle alongside the active locale, so a genuinely missing key (there shouldn't be any — see the translation-status doc) falls back to real English text instead of showing a raw i18next key to a visitor.

## SEO: hreflang, canonical, sitemap

All in `web/src/data/seo.ts`, generated from data (not hand-maintained per page):

- Self-referencing `canonical` on every page, pointing at that exact locale's own URL.
- `hreflang` alternate links for all 16 active locales plus `x-default` (→ English), on every indexable page.
- `sitemap.xml` lists every (indexable page × active locale) URL — 9 pages × 16 locales = 144 URLs currently. `/thank-you` is intentionally excluded (post-purchase redirect target, not meant to be indexed) and still gets a `noindex` meta tag instead of canonical/hreflang tags.
- `og:locale`, localized OG/Twitter title+description, and a translated `featureList`/FAQPage JSON-LD per locale.

## SSR/prerendering correctness

`scripts/prerender.mjs` calls one combined `renderPage(url)` (in `entry-server.tsx`) per route × locale, which resolves the locale from the URL, builds the i18n instance, and renders `<title>`/meta/JSON-LD and the page HTML together — so both are always generated from the exact same i18n instance/locale, never two separate ones that could drift. It also replaces `<html lang="en">` in the template with the real `lang` (and `dir="rtl"` for Arabic) per page.

Hydration-matching (`entry-client.tsx`) is unchanged in approach from before this work: the prerendered root `<div>` is stamped `data-route="<the exact URL rendered>"` (now including the locale prefix, e.g. `data-route="/de/features"`), and the client only calls `hydrateRoot` when that matches the current URL — otherwise it does a fresh client render (SPA-fallback/dev-server case). Because `createI18n` always resolves the same locale from the same URL on both sides, and `useSuspense: false` means `t()` never returns a loading state, there is no hydration-mismatch class introduced by i18n.

## What was deliberately left out of this round

- **Locale-specific 404 pages.** A broken/unlinked URL under `/de/...` that was never prerendered 404s via the host's single static `dist/404.html` (English) — same as every unprefixed broken URL did before this work. The app's own in-SPA catch-all route *is* locale-aware (shows the translated 404 copy) for any path that *does* get matched client-side after hydration; it's only the host-level static fallback that stays English-only, which matches this site's existing (pre-i18n) 404 behavior.
- A handful of purely decorative/illustrative mock-data labels in the homepage's "Running Apps", "Battery" and "Mac Info" spotlight sections (app names like "Chrome"/"Slack", example spec values like "MacBook Pro (14-inch)" or "Apple M2 Pro") are left as literal example data, not translated — they're arbitrary illustrative figures, not real UI copy, in the same way the English version never "translated" them into different example numbers either.

See `docs/i18n-translation-status.md` for what's translated vs. machine-translated-pending-review vs. not yet covered.
