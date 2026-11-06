// t24: Logik aus 1.2.0 bis 1.2.2 gegen die echte Datei: A2 formOeffnen, A3 Überträge netto,
// C7 Brutto-Zeilen,
// A4 Klicksperre und kompaktes JSON, G2 Rückgängig nach Löschen.
// A1 (Rechnerzeile) und die Klappen stehen in t25 und brauchen einen echten Browser:
// jsdom lässt den Fehler aus 1.2.0 durch, weil es keine Touch-Vorgaben kennt.
// Läuft gegen die echte Datei; alle Beträge im Test sind erfunden, Namen werden nie
// ausgegeben (Regel 8).
// Aufruf: node t24-bedienung.js <index.html> <finanzdaten.json>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const html = path.resolve(process.argv[2] || 'build/index.html');
const datei = path.resolve(process.argv[3] || 'finanzdaten.json');
let fehl = 0;
const chk = (n, ok, info) => { console.log((ok ? 'OK    ' : 'FEHL  ') + n + (info ? '  ' + info : '')); if (!ok) fehl++; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  const fehler = []; page.on('pageerror', e => fehler.push(String(e))); page.on('dialog', d => d.accept());
  await page.addInitScript(j => localStorage.setItem('finanzapp_data', j), fs.readFileSync(datei, 'utf-8'));
  await page.goto('file://' + html);
  await page.waitForTimeout(700);

  // --- A2: Bearbeiten öffnet sichtbar ---
  const a2 = await page.evaluate(() => {
    const k = state.konten[0]; if (!k) return { keinKonto: true };
    editKonto(k.id);
    const det = $('koName').closest('details'), t = det.querySelector('.formtitel');
    const o = { offen: det.open, betitelt: t.textContent.startsWith('Bearbeiten:'), leuchtet: det.classList.contains('flash'),
      gefuellt: $('koName').value === k.name };
    resetKontoForm();
    o.zurueck = !t.textContent.startsWith('Bearbeiten:');
    return o;
  });
  chk('Bearbeiten klappt das Formular auf', a2.offen && a2.gefuellt);
  chk('Überschrift nennt den bearbeiteten Eintrag', a2.betitelt);
  chk('Formular leuchtet kurz auf', a2.leuchtet);
  chk('Abbrechen setzt die Überschrift zurück', a2.zurueck);

  // --- A3: Überträge netto pro Konto (erfundene Daueraufträge) ---
  const a3 = await page.evaluate(() => {
    const A = 'KontoA-Test', B = 'KontoB-Test';
    const s = (konto, nach, betrag, topfId) => ({ typ: 'Übertrag', konto, kontoNach: nach, betrag, n: 1, einheit: 'M', topfId });
    const tp = toepfe()[0];
    const r = ueberNetto([s(A, B, 1000), s(B, A, 300), ...(tp ? [s(A, B, 150, tp.id)] : [])]);
    const b = r.find(x => x.name === B) || {}, a = r.find(x => x.name === A) || {};
    renderAbos();
    return { b: Math.round(b.netto), a: Math.round(a.netto), reihen: r.length,
      topfZeilen: tp ? Object.keys(b.toepfe || {}).length : null,
      topfBetrag: tp ? Math.round(Object.values(b.toepfe || {})[0] || 0) : null,
      kasten: $('fixUebBox').innerHTML.length > 0 };
  });
  chk('Zielkonto zeigt den Nettozufluss', a3.b === 700 + (a3.topfZeilen ? 150 : 0), 'netto ' + a3.b);
  chk('Quellkonto zeigt denselben Betrag negativ', a3.a === -(700 + (a3.topfZeilen ? 150 : 0)), 'netto ' + a3.a);
  chk('Topf-Dauerauftrag als Unterzeile', a3.topfZeilen === null || (a3.topfZeilen === 1 && a3.topfBetrag === 150), 'Topfzeilen: ' + a3.topfZeilen);
  chk('Wiederk. rendert den Kasten', a3.kasten);

  // --- C7: Ausgaben und Einnahmen brutto, Gegenstuecke als eigene Zeile ---
  const c7 = await page.evaluate(() => {
    const alt = state.serien, k = state.konten[0].name;
    const s = (typ, betrag) => ({ id: 'x' + Math.random(), typ, titel: 'T', betrag, konto: k, n: 1, einheit: 'M', start: TODAY, aktiv: true });
    state.serien = [s('Ausgabe', 100), s('Ausgabe', 50), s('Ausgabe', -30), s('Einnahme', 200), s('Einnahme', -20)];
    renderAbos();
    const o = {
      aus: $('fixAus').textContent, rueck: $('fixAusRueck').textContent,
      ein: $('fixEin').textContent, abzug: $('fixEinAbzug').textContent,
      blick: $('fixMonat').textContent,
      rueckSichtbar: !$('rowAusRueck').classList.contains('hidden'),
      abzugSichtbar: !$('rowEinAbzug').classList.contains('hidden'),
      soll: { aus: fmtCHF(150), rueck: fmtCHF(30), ein: fmtCHF(200), abzug: fmtCHF(20), blick: fmtCHF(120) },
    };
    // ohne Gegenstuecke bleiben die Unterzeilen weg
    state.serien = [s('Ausgabe', 100), s('Einnahme', 200)];
    renderAbos();
    o.ohneRueck = $('rowAusRueck').classList.contains('hidden') && $('rowEinAbzug').classList.contains('hidden');
    state.serien = alt; renderAbos();
    return o;
  });
  chk('Ausgaben brutto: Rückerstattung nicht gegengerechnet', c7.aus === '\u2212' + c7.soll.aus + ' / Mt', c7.aus);
  chk('Rückerstattungen als eigene Zeile', c7.rueckSichtbar && c7.rueck === '+' + c7.soll.rueck + ' / Mt', c7.rueck);
  chk('Einnahmen brutto: Abzug nicht gegengerechnet', c7.ein === '+' + c7.soll.ein + ' / Mt', c7.ein);
  chk('Abzüge als eigene Zeile', c7.abzugSichtbar && c7.abzug === '\u2212' + c7.soll.abzug + ' / Mt', c7.abzug);
  chk('Blickfang bleibt die effektive Belastung', c7.blick === c7.soll.blick, c7.blick);
  chk('ohne Gegenstücke keine Unterzeilen', c7.ohneRueck);

  // --- A4: Klicksperre und kompaktes JSON ---
  const a4 = await page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const echt = saveData;
    window.saveData = async () => { await warte(250); return echt(); };   // träger Handle
    const k = state.kategorien.find(k => k.typ === 'Ausgabe');
    state.serien.push({ id: 'sT24', titel: 'T24 Testserie', betrag: 42, typ: 'Ausgabe', kategorieId: k.id,
      konto: state.konten[0].name, n: 1, einheit: 'M', start: addDays(TODAY, -40), letzte: null, auto: false, aktiv: true });
    renderFaellig();
    const b = document.querySelector('[data-fb]');
    const vorher = state.transaktionen.length;
    b.click(); b.click(); b.click();                 // drei schnelle Tipps
    const text = b.textContent;
    await warte(1200);
    const neu = state.transaktionen.filter(t => t.serieId === 'sT24');
    const json = localStorage.getItem('finanzapp_data') || '';
    window.saveData = echt;
    return { anzahl: state.transaktionen.length - vorher, gesperrt: /Speichere/.test(text),
      testId: neu.length ? neu[0].id : null, kompakt: json.indexOf('\n') === -1, laenge: json.length };
  });
  chk('drei schnelle Tipps erzeugen genau eine Buchung', a4.anzahl === 1, a4.anzahl + ' Buchungen');
  chk('während des Speicherns ist der Knopf gesperrt und sichtbar beschäftigt', a4.gesperrt);
  chk('gespeichertes JSON ist kompakt', a4.kompakt, a4.laenge + ' Zeichen');

  // --- G2: Rückgängig nach Löschen ---
  const g2 = await page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const id = state.transaktionen.filter(t => t.serieId === 'sT24')[0].id;
    openTx(id);
    $('dlgDel').click();
    await warte(600);
    const weg = !state.transaktionen.some(t => t.id === id);
    const u = document.querySelector('#toastMsg [data-undo]');
    const toast = !!u;
    if (u) u.click();
    await warte(600);
    const t = state.transaktionen.find(t => t.id === id);
    const zurueck = !!t && t.serieId === 'sT24';
    // Aufräumen: Testbuchung und Testserie wieder entfernen (nur im Speicher)
    state.transaktionen = state.transaktionen.filter(x => x.serieId !== 'sT24');
    state.serien = state.serien.filter(s => s.id !== 'sT24');
    aggInvalidate(); renderAll();
    return { weg, toast, zurueck, aggFrisch: liveSum !== undefined };
  });
  chk('Löschen entfernt die Buchung', g2.weg);
  chk('Toast bietet Rückgängig an', g2.toast);
  chk('Rückgängig stellt dieselbe id wieder her', g2.zurueck);

  chk('keine JS-Fehler', fehler.length === 0, fehler.join(' | '));
  await browser.close();
  process.exit(fehl ? 1 : 0);
})();
