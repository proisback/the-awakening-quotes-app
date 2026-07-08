# Hitaarth Metrics — Founder's One-Pager

Dashboard: **prateek-mehta.goatcounter.com**. Every event shows up as a "page" whose path starts with `/e/`. The charts, date ranges, and totals GoatCounter gives you for pages all work per event. Ignore the referrer / browser / size tabs — our pings all come from the app itself, so only the counts and trends mean anything.

**One honest limitation first:** these are event counts, not people. Privacy-first means no user IDs, so you can't follow one person across days. You read trends and ratios, not individuals.

## The five founder questions

### 1. Is anyone showing up? — `/e/open`, `/e/install`
`open` = the app was opened. `install` = someone added it to their home screen (the strongest single signal of intent — a person gave you real estate on their phone).
**Read it as:** opens per day, week over week. Flat is fine pre-launch; what matters is the step-change after each marketing push.

### 2. Are they getting value? — `/e/read`, `/e/save`, `/e/note`, `/e/did-it`
`read` = scrolled to another quote. `save` = favorited. `note` = wrote a personal note (deepest engagement — they're journaling). `did-it` = tapped "Did it" on Today's Move.
**`did-it` is the product thesis in one number.** The app exists to turn wisdom into action; every other quotes app stops at reading. If `did-it` stays near zero while `read` grows, the differentiator isn't landing and the roadmap should react.

### 3. Is the sharing loop working? — `/e/share-*` then `/e/arrive-*`
Shares by format: `share-status` (WhatsApp story size), `share-card-full`, `share-card-small`, `share-text`, `share-streak`. Arrivals: `arrive-qr` (someone scanned a card's QR), `arrive-card` (tapped a shared text link), `arrive-streak`, plus one per marketing channel (see the kit — `arrive-cohort`, `arrive-li`, etc.).
**The loop ratio: arrivals ÷ shares.** Shares without arrivals means cards are being sent but not converting viewers into visitors. `share-status` outpacing other formats confirms the WhatsApp-first thesis.

### 4. Will anyone pay? — `/e/paywall`, `/e/notify-me`
`paywall` = someone hit the premium screen. `notify-me` = they raised a hand.
**Decision rule (set on 2026-07-08):** after ~2 weeks of real traffic, if notify-me ÷ paywall is 20%+ on a meaningful base (50+ paywall views), build payment rails. Well under 10%, don't — improve the offer instead. In between, wait for more data. One tap per user is counted, so this ratio is honest.

### 5. Is the habit forming? — `/e/reminder-on`, plus `open` cadence
`reminder-on` = notifications granted (a returning-user contract). `style-noir` / `style-paper` / `style-dusk` = card style changes; whichever style dominates tells you what the premium template pack should look like.

## Ratios that matter more than totals

| Ratio | Question it answers |
| --- | --- |
| did-it ÷ open | Is the core promise (act, don't just read) working? |
| shares ÷ open | Is the product share-worthy? |
| arrivals ÷ shares | Do shared cards actually pull people in? |
| notify-me ÷ paywall | Is premium worth building? |
| install ÷ open | Are visitors committing? |

## Weekly ritual (10 minutes, pick a fixed day)

1. Open the dashboard, set range to the last 7 days, compare with the 7 before.
2. Write down the five ratios above in a note. Trend beats absolute number.
3. One decision per week maximum. If nothing crossed a threshold, the decision is "keep going."

Housekeeping: your own visits count too — add your home IP under GoatCounter Settings → "Ignore IPs" so you don't read your own testing as traction. Localhost and Do-Not-Track visitors are never counted (by design).
