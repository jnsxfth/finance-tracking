// Schreibprüfung: veralteter Lesezugriff darf nicht als Fehler gelten,
// ein fremder Stand schon. Dazu Abschneiden und Wiederverbinden-Banner.
// Aufruf: node t18-schreibpruefung.js [<index.html>]   (Standard: ../build/index.html)
const { chromium } = require('playwright');
const fs = require('fs');
const fails = [];
const chk = (n, ok, i) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${n}${i !== undefined ? ' → ' + i : ''}`); if (!ok) fails.push(n + ' → ' + i); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto('file://' + require('path').resolve(process.argv[2] || __dirname + '/../build/index.html'));
  await page.waitForTimeout(500);

  // Eine Datei im Speicher nachbauen, die sich wie Android verhält
  const r = await page.evaluate(async () => {
    const mk = (verhalten) => {
      let inhalt = '', gelesen = 0;
      return {
        name: 'test.json', verhalten,
        async createWritable() {
          let buf = '';
          return {
            async truncate(n) { if (n === 0) buf = ''; else buf = buf.slice(0, n); },
            async write(d) { buf += d; },
            async close() {
              if (verhalten === 'kein-truncate') inhalt = buf + inhalt.slice(buf.length);
              else inhalt = buf;
            },
          };
        },
        async getFile() {
          // "traege": die ersten beiden Lesezugriffe geben noch den alten Stand
          const alt = this._alt || '';
          const txt = (verhalten === 'traege' && gelesen++ < 2) ? alt : inhalt;
          if (verhalten !== 'traege') this._alt = inhalt;
          return { text: async () => txt };
        },
        _setAlt(s) { this._alt = s; },
        _inhalt() { return inhalt; },
      };
    };
    const out = {};
    const probe = async (verhalten, altInhalt) => {
      const h = mk(verhalten);
      if (altInhalt) h._setAlt(altInhalt);
      const json = JSON.stringify({ meta: { rev: 7 }, x: 'neu' }, null, 2);
      await schreibeDatei(h, json);
      const p = await bestaetigeSchreiben(h, 7);
      return { p, inhalt: h._inhalt() };
    };
    out.normal = await probe('normal');
    out.traege = await probe('traege', JSON.stringify({ meta: { rev: 6 }, x: 'alt' }, null, 2));
    // Dateisystem schneidet nicht ab: alter, längerer Rest bleibt stehen
    const h = mk('kein-truncate');
    const langes = JSON.stringify({ meta: { rev: 6 }, x: 'alt'.repeat(80) }, null, 2);
    await (async () => { const w = await h.createWritable(); await w.write(langes); await w.close(); })();
    const kurz = JSON.stringify({ meta: { rev: 7 }, x: 'k' }, null, 2);
    await schreibeDatei(h, kurz);
    out.keinTruncate = { p: await bestaetigeSchreiben(h, 7), laenge: h._inhalt().length, soll: kurz.length };
    // fremder Stand
    const h2 = mk('normal');
    await (async () => { const w = await h2.createWritable(); await w.write(JSON.stringify({ meta: { rev: 9 } })); await w.close(); })();
    out.fremd = await bestaetigeSchreiben(h2, 7);
    return out;
  });

  console.log('\n--- Schreibprüfung ---');
  chk('normales Schreiben bestätigt', r.normal.p.ok === true && !r.normal.p.muell, JSON.stringify(r.normal.p));
  chk('träges Dateisystem: kein Fehler, sondern Wiederholung', r.traege.p.ok === true, JSON.stringify(r.traege.p));
  chk('fremder Stand wird als Fehler erkannt', r.fremd.ok === false && !r.fremd.unbestaetigt, JSON.stringify(r.fremd));
  chk('ohne Abschneiden: Rest erkannt, Daten gültig', r.keinTruncate.p.ok === true && r.keinTruncate.p.muell > 0,
    JSON.stringify({ muell: r.keinTruncate.p.muell, laenge: r.keinTruncate.laenge, soll: r.keinTruncate.soll }));

  // --- Banner ---
  console.log('\n--- Banner ---');
  const b = await page.evaluate(() => {
    pendingHandle = { name: 'finanzdaten.json' }; fileHandle = null;
    updateFileStatus();
    const sichtbar = !document.getElementById('connBanner').classList.contains('hidden');
    const txt = document.getElementById('connText').textContent;
    pendingHandle = null; updateFileStatus();
    return { sichtbar, txt, danach: document.getElementById('connBanner').classList.contains('hidden') };
  });
  chk('Banner erscheint ohne Freigabe', b.sichtbar && /Freigabe/.test(b.txt), b.txt.slice(0, 70));
  chk('Banner verschwindet nach dem Verbinden', b.danach);

  console.log('\nJS-Fehler:', errs.length ? errs : 'keine');
  if (errs.length) fails.push('JS-Fehler: ' + errs[0]);
  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' FEHLSCHLAG\n' + fails.join('\n') : '\nAlle Prüfungen bestanden.');
  process.exit(fails.length ? 1 : 0);
})();
