// Minimal service worker — just enough to make the app installable.
// No offline caching yet (this app needs a live connection to Firebase
// anyway), so it simply passes every request straight through to the
// network unchanged.
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
