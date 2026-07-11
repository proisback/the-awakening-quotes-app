# CLAUDE.md — Hitaarth (Daily Wisdom)

An installable PWA quotes reader plus its landing page. Vanilla HTML/CSS/JS. **No build step, no frameworks, no dependencies.**

- **Live:** https://the-awakening-quotes-app.vercel.app/ (landing page at the root; the app lives at **/read/**)
- **Repo:** https://github.com/proisback/the-awakening-quotes-app

## Hard constraints (do not break these)

- **Zero dependencies, zero build.** No npm, no bundler, no package.json. Files are served exactly as they sit in the repo. If a change needs a build step, it's the wrong change.
- **Backgrounds are CSS, never images.** The black/white minimalist look is done with CSS variables and gradients. Don't introduce background image assets. (The only raster besides icons/screenshots is `icons/og.png`, the landing page's social preview — metadata, not a page background.)
- **All content lives in `read/quotes.json`.** Never hardcode quotes in JS/HTML — including the landing page, whose live card, sample cards, and quote-counts all render from the fetched `quotes.json` (static values are no-JS fallbacks only).
- **Keep it lite.** The code is ~110 KB; the full offline weight (code + quotes + i18n + fonts) is ~1.75 MB. Never quote "~200KB" (stale pre-expansion figure), and never publish a byte/MB number in user-facing copy unless it's generated automatically — public copy says "light enough to install in seconds" / "built to stay lightweight". Prefer 10 lines of vanilla over a helper/abstraction.
- **Landing page discipline (root `index.html`):** it is Chapter Zero of the app, not an advertisement — no features section, ever; every claim must map to a repo fact; the Chapter 7 origin story is canon text (matches the app's About card verbatim), zero edits.
- **Files are CRLF.** Preserve existing line endings when editing.

## File structure

At the repo root: the landing page and shared assets. The app lives in `read/`.

- `index.html` (root) — the landing page: one self-contained file (inline CSS/JS, ~44 KB), nine "chapters" + a builders' appendix per the spec in the vault (`Tijori/01-Projects/Hitaarth-Quotes-App/artifacts/2026-07-12-landing-page-spec.md`). Fetches `/read/quotes.json` after first paint for the live card, postcards, sample pair, and quote-counts; lazy-loads `/read/i18n/hi.json` on the EN|हिं toggle or when Chapter four nears. GoatCounter events: `land-open`, `land-cta-hero`, `land-cta-begin`, `land-toggle-hi`, `land-builders`, plus `arrive-<s>` from `?s=`.
- `service-worker.js` (root) — **self-destructing stub** for installs that predate the `/read/` move: deletes only the old `hitaarth-cache`, unregisters itself. Remove ~30 days after the landing launch (tracked in roadmap.md).
- `fonts/`, `icons/`, `screenshots/` — shared by both pages, referenced by absolute paths (`/fonts/...`). `icons/og.png` is the landing OG image (1200×630, exported from the app's own share renderer).
- `metrics.md`, `README*`, `tools/`, `vercel.json` — stay at root.

Inside `read/` (the app — its service worker scope is `/read/`, manifest `start_url`/`scope` are `/read/`, manifest `id` stays `"/"` so existing installs keep their identity):

- `read/index.html` — an inline SVG icon sprite (`<symbol id="i-…">`, stroke icons styled via `.ic-svg`), a first-open splash (`#splash`), four screens (reader feed, browse, saved, settings) + bottom tab bar (hidden on the reader — the reader has a single 4-button toolbar: favorite / listen / share / more), a More `<dialog>` (`#moreSheet`: note, surprise, copy + Browse/Saved/Settings nav), a note `<dialog>`, a share `<dialog>` (`#shareSheet`: card style picker + Status/Big/Small image / text), a premium paywall `<dialog>` (`#paywall`), an About card in Settings, and a `#toast` element.
- `read/styles.css` — black/white minimalist theme; light/dark/system via `html[data-theme=...]` and a `prefers-color-scheme` media query. `@font-face` urls point at the shared root `/fonts/`. Ends with `.sheet-actions button` and `.toast` rules (file was once truncated here — keep it complete).
- `read/app.js` — all logic, vanilla, single `state` object. Reader is a vertical scroll-snap feed of quote cards tracked by `IntersectionObserver`. Persists favorites / notes / streak / settings in `localStorage`. HTML is injected, so all quote fields pass through `escapeHTML()` (coerces with `String(s ?? "")`) — keep it that way (XSS safety). The Saved screen lists anything favorited **or** noted; notes show inline with a delete control. Reminders are best-effort and **in-app only**: a `setTimeout`-scheduled `Notification` that fires while the app is open/backgrounded — no backend, not guaranteed once fully closed (guarded with `typeof Notification !== "undefined"` for older iOS Safari). Tapping Share opens a menu with a card-style picker (Noir/Paper/Dusk) and three image formats: Status 1080×1920, full card and quote-only 1080×1350 — all vanilla `<canvas>`, no library. Cards share the reader's typography system: `thoughtGroups()` splits long quotes at sentence pauses (incl. the Hindi danda), `layoutQuoteBlock()` caps the measure at a book column and scales type by quote length, `drawBrandFooter()` draws the quiet imprint + 100px QR. Images share via `navigator.share({files})` on phones or download on desktop (image only, plus a text caption path via **Share as text**). Reader toolbar auto-hides while the feed scrolls (`body.bar-hide`).
- `read/quotes.json` — array of `{ id, text, author, source, sourceType, lesson, category, action, genre }`. Every item needs all nine fields; `sourceType` is one of Book / Scripture / Movie / TV Show / Speech / Interview / Podcast / Essay / Letter / Poem / Aphorism (shown as the source kicker). `id` must be unique and stable (favorites/notes key off it).
- `read/service-worker.js` — network-first (fresh when online, cache fallback offline, then `/read/index.html`). Cache name `hitaarth-read-v1`; only caches `res.ok` responses — never 404s/5xx. Precaches core assets + shared root assets (absolute paths) in its `ASSETS` array. No version bumps needed for content updates; if you rename/move an asset, update `ASSETS`.
- `read/manifest.webmanifest` — PWA manifest. Icon/screenshot paths are absolute (`/icons/...`, `/screenshots/...`); shortcut URLs stay relative.
- `icons/` (root) — `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `qr.png`, `og.png`. Paths in `read/manifest.webmanifest`, both `index.html`s, and `read/service-worker.js` must match these exactly.
- `vercel.json` — static config: `no-cache` headers on both service workers (`/service-worker.js`, `/read/service-worker.js`), and `Content-Type: application/manifest+json` on `/read/manifest.webmanifest`. No build command; Vercel serves the repo as-is.

## Gestures (reader)

Single tap = toggle distraction-free ("immersive"); double tap = favorite; long-press = copy; swipe right = favorite; swipe left = note.

## Conventions

- `$ / $$` are querySelector helpers; `store.get/set` wrap `localStorage` with JSON + try/catch.
- Any new asset path must exist at the exact referenced path across `index.html`, `manifest.webmanifest`, and `service-worker.js`'s `ASSETS`. A path mismatch breaks installability and offline caching (the SW uses `cache.addAll`, which fails atomically on any 404).

## Verify before pushing

- `node --check read/app.js` passes (also `node --check service-worker.js` and `node --check read/service-worker.js` if touched).
- `read/styles.css` ends with the complete `.toast` rule.
- `read/quotes.json` is valid JSON and every item has all **nine** fields (`id, text, author, source, sourceType, lesson, category, action, genre`).
- Every asset path referenced in code exists on disk — including the landing page's `/read/...`, `/fonts/...`, `/icons/...` references.
- **`node tools/check-i18n.js` passes** — every locale (`read/i18n/hi.json`, `es.json`, `fr.json`) must cover ALL `read/quotes.json` ids (`text/lesson/action` each) plus every UI key in `read/app.js`'s `I18N.en`.

## Adding or changing content (MUST)

Translations do NOT auto-propagate. Whenever you add or edit a quote in `read/quotes.json`, you MUST add/update the matching `{ text, lesson, action }` entry in **all three** `read/i18n/<lang>.json` files (Hindi in Devanagari; Bollywood lines kept in their original wording, Hollywood/English translated). Same for any new UI string added to `I18N.en`. Then run `node tools/check-i18n.js` before committing — it fails loudly and names any locale gap. Never ship a quote that only exists in English.

## Deploy

Vercel auto-deploys on every push to `main` (static, no build, repo root served as-is). Just commit and push to `main` — the live site updates automatically. (Hosting moved from Netlify 2026-07-08 after its workspace ran out of credits; the old the-awakening-quotes.netlify.app domain is dead — never reference it. The QR in `icons/qr.png` encodes the Vercel URL with `?s=qr` for arrival tracking.)

## Local preview (Windows)

`python -m http.server 8000`, then open http://localhost:8000 (landing) and http://localhost:8000/read/ (app) — a static server is needed so the `quotes.json` fetches and the service worker work.
