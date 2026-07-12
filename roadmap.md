# Hitaarth Roadmap

Updated 2026-07-08. Operating thesis: **distribution before monetization.** The WhatsApp morning-forward ritual is the app's real growth surface; share cards are the product's catalog-photos moment. Nothing below gets built on vibes once analytics land.

## Now (building)

1. **Privacy-first analytics** - BUILT 2026-07-08. Events: open, read, save, note, did-it, share (per format), share-streak, paywall, reminder-on, install. Local day-counters always (`hitaarthStats()` in the console); remote aggregation activates when the GoatCounter site code is set in `GC_SITE` in `app.js` (free account, 2-minute signup). Respects Do Not Track, never pings from localhost. GoatCounter account DONE (`GC_SITE = "prateek-mehta"`, dashboard prateek-mehta.goatcounter.com) — the roadmap said this was open long after the code shipped; corrected 2026-07-12.
2. **WhatsApp Status share card** - BUILT 2026-07-08. 1080x1920 vertical render, top option in the share sheet, vertically centered quote block, brand footer + QR.
3. **Hindi share cards** - BUILT 2026-07-08. Devanagari-aware canvas font stack (Noto Serif Devanagari → Mangal → Nirmala UI) and taller line ratios (1.6+) on all three card formats.

## Next

4. **Share-card templates** - FREE TIER BUILT 2026-07-08: three styles (Noir / Paper / Dusk) selectable in the share sheet, remembered across sessions, applied to all three formats, per-style usage tracked. Premium template pack remains the upsell once demand data exists.

## Parked

5. **Payment rails** (Razorpay Payment Links or Gumroad license keys) - do not build on zero demand signal. CHEAP TEST BUILT 2026-07-08: paywall CTA is a one-tap demand signal, counted as `notify-me`. RENAMED 2026-07-12 for honesty (nothing could actually notify anyone - no email, no push): CTA now reads "I want this", persists as "✓ Noted", confirmation toast "Noted — this helps decide what gets built next." Event name and localStorage key unchanged, so the metric series is continuous. Read the paywall→notify-me conversion after two weeks of traffic, then decide on rails.

## Killed (decided 2026-07-08)

6. **"Widgets" in premium copy** - KILLED. PWA widgets do not meaningfully exist on Android/iOS; the promise could not ship. Copy now reads "Unlock theme packs & fonts" in all locales; the dead widgets toast string was removed.
7. **es/fr locale expansion** - KILLED. India thesis; new locales are maintenance tax with no user behind them. Existing es/fr files stay maintained for current UI keys, but no new locales and no locale-specific features.

## Shipped since (2026-07-11)

- **Ideas Library expansion**: 151 → 569 quotes in four languages; sourceType taxonomy (the source kicker names the medium); TV pack (67 quotes) added at the owner's direction — copyright posture recorded in the vault ADR (20260711), review-before-charging still open.
- **Landing page + /read/ migration (2026-07-12)**: the app moved to `/read/` (manifest `id` unchanged, root SW replaced by a self-destructing stub); a Chapter Zero landing page took the root per the approved spec (vault: `2026-07-12-landing-page-spec.md`). New GoatCounter events: land-open, land-cta-hero, land-cta-begin, land-toggle-hi, land-builders. TODO ~2026-08-11: delete the root SW stub (`/service-worker.js`) once legacy installs have cycled. AFTER FIRST DEPLOY: confirm `land-open` / `arrive-landing` / `arrive-qr` appear in the GoatCounter dashboard.

## Watching (build only on signal)

8. **Notes as micro-journal** - if analytics show notes growing, "quote + my note" share cards become the UGC play.
9. **Audio depth** - India skews voice and TTS already exists; anything deeper is noise for now.

## Success metrics

- North star: ritual formation - % of users reading 4+ days/week; 7-day streak attainment.
- Value: "Did it" taps per active user; saves and notes per active user.
- Loop: share-card exports by format (status vs post vs text).
- Monetization readiness: paywall views, notify-me taps.
- Guardrail: session length stays short. Rising time-in-app is a failure signal for a ritual app.
