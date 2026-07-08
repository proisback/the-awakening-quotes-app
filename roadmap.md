# Hitaarth Roadmap

Updated 2026-07-08. Operating thesis: **distribution before monetization.** The WhatsApp morning-forward ritual is the app's real growth surface; share cards are the product's catalog-photos moment. Nothing below gets built on vibes once analytics land.

## Now (building)

1. **Privacy-first analytics** - BUILT 2026-07-08. Events: open, read, save, note, did-it, share (per format), share-streak, paywall, reminder-on, install. Local day-counters always (`hitaarthStats()` in the console); remote aggregation activates when the GoatCounter site code is set in `GC_SITE` in `app.js` (free account, 2-minute signup). Respects Do Not Track, never pings from localhost. OPEN ITEM: create the GoatCounter account and fill in `GC_SITE`.
2. **WhatsApp Status share card** - BUILT 2026-07-08. 1080x1920 vertical render, top option in the share sheet, vertically centered quote block, brand footer + QR.
3. **Hindi share cards** - BUILT 2026-07-08. Devanagari-aware canvas font stack (Noto Serif Devanagari → Mangal → Nirmala UI) and taller line ratios (1.6+) on all three card formats.

## Next

4. **Share-card templates** - free tier first to raise the loop's quality bar, premium templates as the upsell after. Resequenced from the old plan (was premium-first).

## Parked

5. **Payment rails** (Razorpay Payment Links or Gumroad license keys) - do not build on zero demand signal. Cheap test first: turn the paywall "Coming soon" CTA into a "Notify me" tap and count it for two weeks. Revisit with data.

## Kill candidates (pending final call)

6. **"Widgets" in paywall copy** - PWA widgets do not meaningfully exist on Android/iOS; the promise cannot ship. Five-minute honesty edit whenever confirmed.
7. **es/fr locale expansion** - India thesis; new locales are maintenance tax with no user behind them. Keep existing files, add no more.

## Watching (build only on signal)

8. **Notes as micro-journal** - if analytics show notes growing, "quote + my note" share cards become the UGC play.
9. **Audio depth** - India skews voice and TTS already exists; anything deeper is noise for now.

## Success metrics

- North star: ritual formation - % of users reading 4+ days/week; 7-day streak attainment.
- Value: "Did it" taps per active user; saves and notes per active user.
- Loop: share-card exports by format (status vs post vs text).
- Monetization readiness: paywall views, notify-me taps.
- Guardrail: session length stays short. Rising time-in-app is a failure signal for a ritual app.
