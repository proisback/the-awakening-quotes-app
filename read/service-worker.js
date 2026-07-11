// Network-first: always try the network so quotes.json edits reach returning
// users without a version bump; fall back to cache when offline.
// Lives at /read/ (scope /read/); shared assets (fonts, icons, screenshots) stay at the root.
const CACHE = "hitaarth-read-v1";
const ASSETS = [
  "/read/", "/read/index.html", "/read/styles.css", "/read/app.js", "/read/quotes.json",
  "/read/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png", "/icons/qr.png",
  "/screenshots/narrow.png", "/screenshots/wide.png",
  "/read/i18n/es.json", "/read/i18n/hi.json", "/read/i18n/fr.json",
  "/fonts/PlayfairDisplay.woff2", "/fonts/Fraunces.woff2", "/fonts/Cormorant.woff2", "/fonts/Spectral-400.woff2", "/fonts/Spectral-600.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then(res => {
        // Only cache successful responses — never 404s, 5xx, or opaque errors.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match("/read/index.html")))
  );
});
