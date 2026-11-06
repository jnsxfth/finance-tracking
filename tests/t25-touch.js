// t25: Rechnerzeile und Klappen am Finger. Braucht einen ECHTEN Browser: der Fehler in
// 1.2.0 war, dass preventDefault() auf touchstart den darauffolgenden click unterdrueckt —
// das kann nur ein Browser mit Touch-Emulation zeigen, kein jsdom-Ersatz.
// Aufruf: node t25-touch.js <index.html>
const { chromium, devices } = require('playwright');
const path = require('path');
const html = path.resolve(process.argv[2] || 'build/index.html');
let fehl = 0;
const chk = (n, ok, info) => { console.log((ok ? 'OK    ' : 'FEHL  ') + n + (info ? '  ' + info : '')); if (!ok) fehl++; };

(async () => {
  const browser = await chromium.launch();
  if (!browser.newContext) { console.log('FEHL  braucht echtes Playwright'); process.exit(1); }
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
  await page.goto('file://' + html);
  await page.waitForTimeout(700);

  // --- Rechnerzeile am Finger ---
  await page.tap('#txBetrag');
  chk('Zeile erscheint beim Antippen des Feldes', await page.isVisible('#txBetrag + .calcbar'));
  const kn = l => page.locator('#txBetrag + .calcbar button', { hasText: l });
  await page.locator('#txBetrag').fill('30');
  for (const l of ['+', '1', '0', '×', '2']) {
    if (l === '1' || l === '0' || l === '2') await page.locator('#txBetrag').pressSequentially(l);
    else await kn(l).tap();
  }
  chk('30+10×2 per Finger eingegeben', (await page.inputValue('#txBetrag')) === '30+10*2', await page.inputValue('#txBetrag'));
  chk('Hinweis rechnet mit', /50/.test(await page.textContent('#txCalc')), (await page.textContent('#txCalc')).trim());
  chk('Feld hat weiter den Fokus (Tastatur bleibt offen)', await page.evaluate(() => document.activeElement.id) === 'txBetrag');
  await kn('⌫').tap();
  chk('Rückschritt am Finger löscht ein Zeichen', (await page.inputValue('#txBetrag')) === '30+10*', await page.inputValue('#txBetrag'));
  await page.locator('#txBetrag').fill('');

  // --- Klappen ---
  for (const [n, sel] of [['Wiederkehrend im Detail', '#fixDetails'], ['Erkannte Muster', '#musterCard']]) {
    await page.evaluate(() => showScreen('abos'));
    await page.waitForTimeout(150);
    chk('«' + n + '» ist zu', !(await page.evaluate(s => document.querySelector(s).open, sel)));
    await page.tap(sel + ' > summary');
    chk('«' + n + '» klappt am Finger auf', await page.evaluate(s => document.querySelector(s).open, sel));
  }
  chk('Zusammenfassung steht in der Klappe', (await page.textContent('#fixSum')) !== null);
  chk('Musterzähler steht in der Klappe', /Posten|keine/.test(await page.textContent('#musterSum')), (await page.textContent('#musterSum')).trim());

  chk('keine JS-Fehler', fehler.length === 0, fehler.join(' | '));
  await browser.close();
  process.exit(fehl ? 1 : 0);
})();
