// Macht die App offline nutzbar. Cacht nur den Programmcode, niemals deine Daten.
// Die Versionsnummer muss sich bei jeder neuen Fassung ändern, sonst merkt der
// Browser nicht, dass es etwas Neues gibt.
const VERSION = '1.15.0-2026-11-14';
const CACHE = 'finanztracker-' + VERSION;
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './archivo.woff2'];
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

// J3: Erinnerung an faellige Dauerauftraege. Der Service Worker kann die Datei nicht lesen;
// die Zahl kommt aus der Tabelle, die die Seite nach jedem Laden und Speichern in IndexedDB
// legt. Hier wird nur gezaehlt. Hoechstens eine Meldung am Tag, keine bei null.
function heuteIso() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function idbZugriff(modus, arbeit) {
  return new Promise(res => {
    let r;
    try { r = indexedDB.open('finanzapp_db'); } catch (e) { res(null); return; }
    r.onupgradeneeded = () => r.transaction.abort();      // keine Datenbank: nichts anlegen
    r.onerror = r.onblocked = () => res(null);
    r.onsuccess = () => {
      const db = r.result; db.onversionchange = () => db.close();
      if (!db.objectStoreNames.contains('h')) { db.close(); res(null); return; }
      const tx = db.transaction('h', modus), out = {};
      arbeit(tx.objectStore('h'), out);
      tx.oncomplete = () => { db.close(); res(out); };
      tx.onerror = tx.onabort = () => { db.close(); res(null); };
    };
  });
}
async function erinnern() {
  const d = await idbZugriff('readonly', (st, out) => {
    ['erinnerung', 'erinnerung_gemeldet', 'erinnerung_topf'].forEach(k => { const q = st.get(k); q.onsuccess = () => { out[k] = q.result; }; });
  });
  const t = d && d.erinnerung;
  if (!t || !t.ein) return;
  const heute = heuteIso();
  await topfMelden(t, d.erinnerung_topf || [], heute);
  const n = (t.offen || 0) + (t.kommend || []).filter(x => x <= heute).length;
  const g = d.erinnerung_gemeldet;
  if (n <= 0 || (g && g.tag === heute && n <= g.n)) return;
  await self.registration.showNotification(n === 1 ? '1 Dauerauftrag fällig' : n + ' Daueraufträge fällig',
    { body: 'Zum Verbuchen tippen.', tag: 'faellig', icon: 'icon-192.png' });
  await idbZugriff('readwrite', st => st.put({ tag: heute, n }, 'erinnerung_gemeldet'));
}
// 1.15.0: Topf am Ziel. Eine Meldung je Fuellung: gemerkt wird 'id|ab'. Wird der Topf geleert
// und neu gefuellt, aendert sich ab und es kommt wieder eine. Eigener Tag, damit sie die
// Meldung zu faelligen Auftraegen nicht ersetzt. Kein Name, kein Betrag (Sperrbildschirm).
async function topfMelden(t, gemeldet, heute) {
  const voll = (t.toepfe || []).filter(x => x.ab <= heute).map(x => x.id + '|' + x.ab);
  const neu = voll.filter(k => gemeldet.indexOf(k) < 0);
  if (neu.length) await self.registration.showNotification(neu.length === 1 ? 'Topf am Ziel' : neu.length + ' Töpfe am Ziel',
    { body: 'Dauerauftrag pausieren. Zum Ansehen tippen.', tag: 'topf', icon: 'icon-192.png' });
  if (JSON.stringify(voll) !== JSON.stringify(gemeldet)) await idbZugriff('readwrite', st => st.put(voll, 'erinnerung_topf'));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'faellig') e.waitUntil(erinnern()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const topf = e.notification.tag === 'topf';           // 1.15.0: fuehrt zu «Konten»
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => 'focus' in x);
    if (!c) return self.clients.openWindow(topf ? './#konten' : './');
    if (topf && c.postMessage) c.postMessage({ zeige: 'konten' });
    return c.focus();
  }));
});
