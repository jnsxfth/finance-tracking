// t23: Erststart einer fremden Person. Eine leere Datei darf keine fremden Zahlen zeigen.
// Prüft: Startkategorien ohne Budget, keine persönlichen Namen, Oberfläche rendert fehlerfrei.
// Aufruf: node t23-neue-person.js <index.html>
const { chromium } = require('playwright');
const path = require('path');
const html = path.resolve(process.argv[2] || 'index.html');
let fehl = 0;
const chk = (n, ok, info) => { console.log((ok ? 'OK    ' : 'FEHL  ') + n + (info ? '  ' + info : '')); if (!ok) fehl++; };

// Begriffe, die aus der Lebenslage des Autors stammen und nicht mitgeliefert werden dürfen
const TABU = ['Sold Militär', 'Unterstützung Eltern', 'Trainingslager', 'Saxo', 'Relai', 'Revolut', 'Raiffeisen'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
  await page.goto('file://' + html);          // kein localStorage: wie beim ersten Öffnen
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => {
    const kats = state.kategorien;
    return {
      n: kats.length, konten: state.konten.map(k => k.name),
      mitBudget: kats.filter(k => (k.bh || []).some(h => +h.budget > 0)).map(k => k.kategorie),
      namen: kats.map(k => k.kategorie).concat(state.gruppen.map(g => g.name)),
      arten: kats.filter(k => !k.art).length,
      histLeer: Object.keys(state.hist.aus).length === 0,
      transaktionen: state.transaktionen.length,
      // Rechnet die Oberfläche durch, ohne dass etwas erfasst ist?
      budgetJahr: jahrTotal('Ausgabe', +TODAY.slice(0, 4)),
      vermoegen: vermoegenAnzeige(),
    };
  });

  chk('Startkategorien vorhanden', r.n > 20, r.n + ' Kategorien');
  chk('kein Budget vorbelegt', r.mitBudget.length === 0, r.mitBudget.join(', '));
  chk('jede Kategorie hat eine Art', r.arten === 0);
  chk('keine Buchungen', r.transaktionen === 0);
  chk('keine Historie', r.histLeer);
  const treffer = TABU.filter(w => r.namen.some(n => n.includes(w)) || r.konten.some(n => n.includes(w)));
  chk('keine persönlichen Namen in den Startwerten', treffer.length === 0, treffer.join(', '));
  chk('Jahressumme ist 0', r.budgetJahr === 0);
  chk('Vermögen ist 0', r.vermoegen === 0);

  // Jeden Bildschirm öffnen: rendert alles ohne Daten?
  for (const s of ['erfassen', 'budget', 'konten', 'abos', 'analyse', 'mehr']) {
    await page.evaluate(n => showScreen(n), s);
    await page.waitForTimeout(120);
  }
  chk('alle sechs Bildschirme rendern fehlerfrei', fehler.length === 0, fehler.join(' | '));

  await browser.close();
  process.exit(fehl ? 1 : 0);
})();
