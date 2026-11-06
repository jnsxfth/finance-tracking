// Macht die App offline nutzbar. Cacht nur den Programmcode, niemals deine Daten.
// Die Versionsnummer muss sich bei jeder neuen Fassung ändern, sonst merkt der
// Browser nicht, dass es etwas Neues gibt.
const VERSION = '1.2.0-2026-11-06';
const CACHE = 'finanztracker-' + VERSION;
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;         // nichts Fremdes cachen
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(r => {
        // Fehlerseite (z. B. 404 bei abgeschaltetem Hosting) nie cachen, sonst ersetzt sie die gute Fassung
        if (!r.ok) return caches.match(e.request).then(c => c || r);
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
