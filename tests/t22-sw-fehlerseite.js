// t22: Service Worker darf eine Fehlerseite (404) nie über die gute Fassung legen.
// Aufruf: node t22-sw-fehlerseite.js <sw.js>
const fs = require('fs'), vm = require('vm'), path = require('path');
let fehl = 0;
const chk = (n, ok) => { console.log((ok ? 'OK    ' : 'FEHL  ') + n); if (!ok) fehl++; };
const code = fs.readFileSync(path.resolve(process.argv[2] || 'sw.js'), 'utf-8');
const handlers = {}, store = new Map();
let netz;
const ctx = {
  self: { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting() {}, clients: { claim() {} } },
  caches: { open: async () => ({ addAll: async () => {}, put: async (rq, rs) => { store.set(rq.url, rs); } }),
            match: async rq => store.get(rq.url), keys: async () => [], delete: async () => true },
  fetch: (...a) => netz(...a), location: { origin: 'https://x.test' }, URL, Promise, console,
};
vm.createContext(ctx); vm.runInContext(code, ctx);
const antwort = (ok, tag) => ({ ok, status: ok ? 200 : 404, tag, clone() { return this; } });
const hole = async () => { const ev = { request: { method: 'GET', url: 'https://x.test/index.html' }, respondWith(p) { this.p = p; } }; handlers.fetch(ev); return ev.p; };

(async () => {
  netz = async () => antwort(true, 'gut');
  chk('200 wird ausgeliefert', (await hole()).tag === 'gut');
  chk('200 wird gecacht', store.get('https://x.test/index.html').tag === 'gut');
  netz = async () => antwort(false, 'fehlerseite');
  chk('404 liefert die gecachte gute Fassung', (await hole()).tag === 'gut');
  chk('404 überschreibt den Cache nicht', store.get('https://x.test/index.html').tag === 'gut');
  netz = async () => { throw new Error('offline'); };
  chk('offline liefert den Cache', (await hole()).tag === 'gut');
  store.clear(); netz = async () => antwort(false, 'fehlerseite');
  chk('404 ohne Cache wird durchgereicht', (await hole()).tag === 'fehlerseite');
  chk('404 ohne Cache wird nicht gecacht', store.size === 0);
  process.exit(fehl ? 1 : 0);
})();
