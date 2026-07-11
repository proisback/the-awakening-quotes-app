// Self-destructing stub. The app's service worker used to live here (scope "/");
// the app now lives at /read/ with its own worker. This stub replaces the old one
// on the next visit, deletes ONLY the old app's cache (Cache Storage is origin-wide,
// so a blanket delete would also wipe the new /read/ cache), and unregisters itself.
// Safe to delete this file ~30 days after launch (tracked in roadmap.md).
const OLD_CACHES = ["hitaarth-cache"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all(OLD_CACHES.map(k => caches.delete(k)))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
