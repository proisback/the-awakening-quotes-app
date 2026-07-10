# CLAUDE.md — Hitaarth (Daily Wisdom)

An installable PWA quotes reader. Vanilla HTML/CSS/JS. **No build step, no frameworks, no dependencies.**

- **Live:** https://the-awakening-quotes-app.vercel.app/
- **Repo:** https://github.com/proisback/the-awakening-quotes-app

## Hard constraints (do not break these)

- **Zero dependencies, zero build.** No npm, no bundler, no package.json. Files are served exactly as they sit in the repo root. If a change needs a build step, it's the wrong change.
- **Backgrounds are CSS, never images.** The black/white minimalist look is done with CSS variables and gradients. Don't introduce background image assets.
- **All content lives in `quotes.json`.** Never hardcode quotes in JS/HTML. To add or edit quotes, edit that file only.
- **Keep it lite.** Whole app is ~200KB. Prefer 10 lines of vanilla over a helper/abstraction. Don't add a framework to "make it easier."
- **Files are CRLF.** Preserve existing line endings when editing.

## File structure (all at repo root)

- `index.html` — an inline SVG icon sprite (`<symbol id="i-…">`, stroke icons styled via `.ic-svg`), a first-open splash (`#splash`), four screens (reader feed, browse, saved, settings) + bottom tab bar (hidden on the reader — the reader has a single 4-button toolbar: favorite / listen / share / more), a More `<dialog>` (`#moreSheet`: note, surprise, copy + Browse/Saved/Settings nav), a note `<dialog>`, a share `<dialog>` (`#shareSheet`: card style picker + Status/Big/Small image / text), a premium paywall `<dialog>` (`#paywall`), an About card in Settings, and a `#toast` element.
- `styles.css` — black/white minimalist theme; light/dark/system via `html[data-theme=...]` and a `prefers-color-scheme` media query. Ends with `.sheet-actions button` and `.toast` rules (file was once truncated here — keep it complete).
- `app.js` — all logic, vanilla, single `state` object. Reader is a vertical scroll-snap feed of quote cards tracked by `IntersectionObserver`. Persists favorites / notes / streak / settings in `localStorage`. HTML is injected, so all quote fields pass through `escapeHTML()` (coerces with `String(s ?? "")`) — keep it that way (XSS safety). The Saved screen lists anything favorited **or** noted; notes show inline with a delete control. Reminders are best-effort and **in-app only**: a `setTimeout`-scheduled `Notification` that fires while the app is open/backgrounded — no backend, not guaranteed once fully closed (guarded with `typeof Notification !== "undefined"` for older iOS Safari). Tapping Share opens a menu with a card-style picker (Noir/Paper/Dusk) and three image formats: Status 1080×1920, full card and quote-only 1080×1350 — all vanilla `<canvas>`, no library. Cards share the reader's typography system: `thoughtGroups()` splits long quotes at sentence pauses (incl. the Hindi danda), `layoutQuoteBlock()` caps the measure at a book column and scales type by quote length, `drawBrandFooter()` draws the quiet imprint + 100px QR. Images share via `navigator.share({files})` on phones or download on desktop (image only, plus a text caption path via **Share as text**). Reader toolbar auto-hides while the feed scrolls (`body.bar-hide`).
- `quotes.json` — array of `{ id, text, author, source, lesson, category }`. Every item needs all six fields. `id` must be unique and stable (favorites/notes key off it).
- `service-worker.js` — network-first (fresh when online, cache fallback offline, then `index.html`). Only caches `res.ok` responses — never 404s/5xx. Precaches core assets + icons in its `ASSETS` array. No version bumps needed for content updates; if you rename/move an asset, update `ASSETS`.
- `manifest.webmanifest` — PWA manifest. Icons live in `icons/`.
- `icons/` — `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`. Paths in `manifest.webmanifest`, `index.html`, and `service-worker.js` must match these exactly.
- `vercel.json` — static config: `no-cache` header on the service worker, and `Content-Type: application/manifest+json` on `manifest.webmanifest`. No build command; Vercel serves the repo root as-is.

## Gestures (reader)

Single tap = toggle distraction-free ("immersive"); double tap = favorite; long-press = copy; swipe right = favorite; swipe left = note.

## Conventions

- `$ / $$` are querySelector helpers; `store.get/set` wrap `localStorage` with JSON + try/catch.
- Any new asset path must exist at the exact referenced path across `index.html`, `manifest.webmanifest`, and `service-worker.js`'s `ASSETS`. A path mismatch breaks installability and offline caching (the SW uses `cache.addAll`, which fails atomically on any 404).

## Verify before pushing

- `node --check app.js` passes.
- `styles.css` ends with the complete `.toast` rule.
- `quotes.json` is valid JSON and every item has all **eight** fields (`id, text, author, source, lesson, category, action, genre`).
- Every asset path referenced in code exists on disk.
- **`node tools/check-i18n.js` passes** — every locale (`i18n/hi.json`, `es.json`, `fr.json`) must cover ALL `quotes.json` ids (`text/lesson/action` each) plus every UI key in `app.js`'s `I18N.en`.

## Adding or changing content (MUST)

Translations do NOT auto-propagate. Whenever you add or edit a quote in `quotes.json`, you MUST add/update the matching `{ text, lesson, action }` entry in **all three** `i18n/<lang>.json` files (Hindi in Devanagari; Bollywood lines kept in their original wording, Hollywood/English translated). Same for any new UI string added to `I18N.en`. Then run `node tools/check-i18n.js` before committing — it fails loudly and names any locale gap. Never ship a quote that only exists in English.

## Deploy

Vercel auto-deploys on every push to `main` (static, no build, repo root served as-is). Just commit and push to `main` — the live site updates automatically. (Hosting moved from Netlify 2026-07-08 after its workspace ran out of credits; the old the-awakening-quotes.netlify.app domain is dead — never reference it. The QR in `icons/qr.png` encodes the Vercel URL with `?s=qr` for arrival tracking.)

## Local preview (Windows)

`python -m http.server 8000`, then open http://localhost:8000 (a static server is needed so `fetch("quotes.json")` and the service worker work).
