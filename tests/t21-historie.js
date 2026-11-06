// t21: Jahreshistorie liegt in der Datei, nicht im Code (ab 1.1.2).
// Prüft, dass das Entfernen der Code-Konstanten nichts verändert hat:
//  - Jahre MIT Buchungen rechnen aus den Buchungen (hatLive gewinnt) und sind mit und
//    ohne Historie identisch;
//  - Jahre OHNE Buchungen rechnen aus der Historie, und zwar genau deren Summe;
//  - der Vermögensverlauf zeigt die migrierten Stände aus state.hist.verm;
//  - eine Datei ohne Historie bekommt leere Fächer statt fremder Zahlen.
// Erwartungswerte kommen aus der Datei selbst, nie aus dem Test.
// Aufruf: node t21-historie.js <index.html> <finanzdaten.json>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const html = path.resolve(process.argv[2] || 'index.html');
const datei = path.resolve(process.argv[3] || 'finanzdaten.json');
let fehl = 0;
const chk = (n, ok, info) => { console.log((ok ? 'OK    ' : 'FEHL  ') + n + (info ? '  ' + info : '')); if (!ok) fehl++; };
const rund = n => Math.round(n * 100) / 100;

(async () => {
  const echt = JSON.parse(fs.readFileSync(datei, 'utf-8'));
  const hist = echt.hist || {};
  const histJahre = Object.keys(hist.aus || {}).sort();
  if (!histJahre.length) { console.log('FEHL  Datei enthält keine Historie - erst 1.1.1 laufen lassen'); process.exit(1); }
  const buchungsJahre = new Set(echt.transaktionen.map(t => t.datum.slice(0, 4)));
  const nurHist = histJahre.filter(j => !buchungsJahre.has(j));   // dort zählt die Historie
  const sollHist = {};
  nurHist.forEach(j => sollHist[j] = {
    aus: rund(Object.values(hist.aus[j] || {}).reduce((a, b) => a + b, 0)),
    ein: rund(Object.values(hist.ein[j] || {}).reduce((a, b) => a + b, 0)),
  });

  const browser = await chromium.launch();
  const lauf = async (daten, jahre) => {
    const page = await browser.newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
    await page.addInitScript(j => localStorage.setItem('finanzapp_data', j), JSON.stringify(daten));
    await page.goto('file://' + html);
    await page.waitForTimeout(600);
    const r = await page.evaluate(js => {
      const aus = {}, ein = {};
      js.forEach(j => { aus[j] = jahrTotal('Ausgabe', +j); ein[j] = jahrTotal('Einnahme', +j); });
      renderVermoegen();
      return {
        aus, ein,
        histJahre: Object.keys(state.hist.aus).sort(),
        histEintraege: ['aus', 'ein', 'verm'].reduce((s, t) => s + Object.keys(state.hist[t]).length, 0),
        migriert: (document.getElementById('vermTable').innerHTML.match(/migriert/g) || []).length,
        vermoegenAnzeige: vermoegenAnzeige(),
        rev: JSON.parse(localStorage.getItem('finanzapp_data')).meta.rev,
      };
    }, jahre);
    await page.close();
    return { ...r, fehler };
  };

  const alleJahre = histJahre.slice();
  const mit = await lauf(echt, alleJahre);
  const ohne = await lauf((() => { const o = JSON.parse(JSON.stringify(echt)); delete o.hist; return o; })(), alleJahre);

  // --- Datei mit Historie
  chk('Historie bleibt vollständig', JSON.stringify(mit.histJahre) === JSON.stringify(histJahre), mit.histJahre.length + ' Jahre');
  chk('Vermögensverlauf zeigt die migrierten Stände',
    mit.migriert === Object.keys(hist.verm || {}).length, mit.migriert + ' von ' + Object.keys(hist.verm || {}).length);
  const abwH = nurHist.filter(j => rund(mit.aus[j]) !== sollHist[j].aus || rund(mit.ein[j]) !== sollHist[j].ein);
  chk('Jahre ohne Buchungen stimmen mit der Historie überein', abwH.length === 0,
    nurHist.length ? nurHist.length + ' Jahre geprüft' : 'keine solchen Jahre in dieser Datei');
  chk('vorhandene Historie löst kein Speichern aus', +mit.rev === +echt.meta.rev, 'rev ' + mit.rev);
  chk('keine JS-Fehler', mit.fehler.length === 0, mit.fehler.join(' | '));

  // --- Dieselbe Datei ohne Historie: Buchungsjahre dürfen sich nicht ändern
  const mitBuchungen = histJahre.filter(j => buchungsJahre.has(j));
  const abwB = mitBuchungen.filter(j => rund(mit.aus[j]) !== rund(ohne.aus[j]) || rund(mit.ein[j]) !== rund(ohne.ein[j]));
  chk('Jahre mit Buchungen sind von der Historie unabhängig', abwB.length === 0,
    abwB.length ? 'abweichend: ' + abwB.join(',') : mitBuchungen.length + ' Jahre geprüft');
  chk('hist wird angelegt, aber leer', ohne.histEintraege === 0, 'Einträge: ' + ohne.histEintraege);
  chk('ohne Historie keine migrierten Stände', ohne.migriert === 0);
  chk('vermoegenAnzeige ohne Historie stürzt nicht ab', Number.isFinite(ohne.vermoegenAnzeige));
  chk('keine JS-Fehler', ohne.fehler.length === 0, ohne.fehler.join(' | '));

  await browser.close();
  process.exit(fehl ? 1 : 0);
})();
