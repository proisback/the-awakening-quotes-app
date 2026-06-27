# Hitaarth — Quotes PWA (Windows-friendly)

A lightweight installable web app that works on **iPhone, Android, and your Windows laptop** — no Mac, no app store needed to start. Rename "Hitaarth" to whatever you like (edit `index.html` title + `manifest.webmanifest`).

## What's inside
```
HitaarthPWA/
  index.html            screens: reader, saved, settings, tab bar
  styles.css            black/white minimalist theme (light/dark/system)
  app.js                gestures, favorites, notes, streak, settings (vanilla JS)
  quotes.json           your content (edit this to change quotes)
  manifest.webmanifest  makes it installable
  service-worker.js     offline + instant launch
  icons/                generated app icons (192 / 512 / maskable / apple-touch)
```

## Features (matches the reference app's UX)
- Full-screen vertical **swipe feed** of quotes (scroll-snap).
- **Tap** to toggle distraction-free view · **double-tap** to favorite (heart pops) · **long-press** to copy · **swipe right** favorite / **swipe left** add note.
- Action bar: favorite, note, share, more. Tabs: Read / Saved / Settings.
- **Settings:** streak card (level + progress), Appearance (System/Light/Dark), Typography (size slider + System/Monospaced/Snell Roundhand cursive + live preview), Reminders toggle, Get Premium placeholder, Reset.
- Favorites, notes, streak, and settings persist on-device (localStorage). No accounts, no tracking.

## Run it on Windows (2 minutes)
A service worker + `fetch` won't work from a double-clicked `file://` page, so serve it locally:

1. Install Python (if needed) from python.org.
2. Open a terminal in the `HitaarthPWA` folder and run:
   ```
   python -m http.server 8000
   ```
3. Open **http://localhost:8000** in Chrome/Edge. (Use DevTools → Toggle device toolbar to preview as a phone.)

## Test on your iPhone / Android (same app, real device)
Easiest is to deploy free (below) and open the URL on your phone. To install:
- **iPhone (Safari):** open the URL → Share → **Add to Home Screen**.
- **Android (Chrome):** open the URL → menu → **Install app / Add to Home screen**.
It then launches full-screen like a native app.

## Deploy free (pick one, all work from Windows)
- **Netlify Drop:** go to app.netlify.com/drop and drag the `HitaarthPWA` folder in. Instant HTTPS URL.
- **GitHub Pages:** push the folder to a repo → Settings → Pages → deploy from branch.
- **Vercel:** `vercel` CLI or drag-drop import.
HTTPS is required for PWA install — all three give it automatically.

## Change the content
Edit `quotes.json`. Each item: `{ "id": "unique-slug", "text": "...", "author": "...", "category": "..." }`.
Keep `id` unique and stable so favorites survive updates. Use short, attributed quotes; avoid long copyrighted passages.

## Honest limits of a PWA (so you're not surprised)
- **iOS home-screen widgets and Live Activities are NOT possible** for web apps — those need a native build. (That was the reference app's paid feature.)
- iOS web notifications work only for an **installed** PWA (iOS 16.4+) and are limited; reliable daily reminders really want a native app. The Reminders toggle here is honest about that.

## When you want it in the App Store / Play Store later
You don't have to rewrite it. Wrap this same web app:
- **PWABuilder.com** (Microsoft, free): point it at your deployed URL → it packages an **Android** app you can submit from Windows, and an **iOS** package (the iOS one still needs a Mac/cloud-Mac to upload).
- **Capacitor** (capacitorjs.com): wraps the web code into native iOS/Android shells and lets you add native widgets/notifications later. iOS upload still needs a Mac or a cloud build (Codemagic/Ionic Appflow).

Start here, validate that people like it, then graduate. The content layer (`quotes.json`) and the whole UI carry straight over.
