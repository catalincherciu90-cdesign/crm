// Service worker minimal: doar pentru instalabilitate (PWA).
// Nu punem in cache paginile (aplicatie cu autentificare) — lasam reteaua sa gestioneze.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // pass-through (fara respondWith) => browserul foloseste reteaua normal
});
