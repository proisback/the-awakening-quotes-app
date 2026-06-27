# CLAUDE.md — Stillpoint (Daily Wisdom)

An installable PWA quotes reader. Vanilla HTML/CSS/JS. **No build step, no frameworks, no dependencies.**

- **Live:** https://the-awakening-quotes.netlify.app/
- **Repo:** https://github.com/proisback/the-awakening-quotes-app

## Hard constraints (do not break these)

- **Zero dependencies, zero build.** No npm, no bundler, no package.json. Files are served exactly as they sit in the repo root. If a change needs a build step, it's the wrong change.
- **Backgrounds are CSS, never images.** The black/white minimalist look is done with CSS variables and gradients. Don't introduce background image assets.
- **All content lives in `quotes.json`.** Never hardcode quotes in JS/HTML. To add or edit quotes, edit that file only.
- **Keep it lite.** Whole app is ~200KB. Prefer 10 lines of vanilla over a helper/abstraction. Don't add a framework to "make it easier."
- **Files are CRLF.** Preserve existing line endings when editing.

## File structure (all at repo root)

- `index.html` — three screens (reader feed, saved, settings) + bottom tab bar, a note `<dialog>`, and a `#toast` element.
- `styles.css` — black/white minimalist theme; light/dark/system via `html[data-theme=...]` and a `prefers-color-scheme` media query. Ends with `.sheet-actions button` and `.toast` rules (file was once truncated here — keep it complete).
- `app.js` — all logic, vanilla, single `state` object. Reader is a vertical scroll-snap feed of quote cards tracked by `IntersectionObserver`. Persists favorites / notes / streak / settings in `localStorage`. HTML is injected, so all quote fields pass through `escapeHTML()` — keep it that way (XSS safety).
- `quotes.json` — array of `{ id, text, author, source, lesson, category }`. Every item needs all six fields. `id` must be unique and stable (favorites/notes key off it).
- `service-worker.js` — network-first cache (fresh when online, cache fallback offline). Caches all core assets + icons in its `ASSETS` array. No version bumps needed for content updates; if you rename/move an asset, update `ASSETS`.
- `manifest.webmanifest` — PWA manifest. Icons live in `icons/`.
- `icons/` — `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`. Paths in `manifest.webmanifest`, `index.html`, and `service-worker.js` must match these exactly.
- `netlify.toml` — static config: publish dir = repo root, no build command, `no-cache` header on the service worker.

## Gestures (reader)

Single tap = toggle distraction-free ("immersive"); double tap = favorite; long-press = copy; swipe right = favorite; swipe left = note.

## Conventions

- `$ / $$` are querySelector helpers; `store.get/set` wrap `localStorage` with JSON + try/catch.
- Any new asset path must exist at the exact referenced path across `index.html`, `manifest.webmanifest`, and `service-worker.js`'s `ASSETS`. A path mismatch breaks installability and offline caching (the SW uses `cache.addAll`, which fails atomically on any 404).

## Verify before pushing

- `node --check app.js` passes.
- `styles.css` ends with the complete `.toast` rule.
- `quotes.json` is valid JSON and every item has all six fields.
- Every asset path referenced in code exists on disk.

## Deploy

Netlify auto-deploys on every push to `main` (static, no build, publish dir = repo root). Just commit and push to `main` — the live site updates automatically.

## Local preview (Windows)

`python -m http.server 8000`, then open http://localhost:8000 (a static server is needed so `fetch("quotes.json")` and the service worker work).
