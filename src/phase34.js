/* ===================== Cockpit, Konten, Farbsignale =====================
   Ist-Werte enthalten nie die Zukunft, sonst wäre „so viel habe ich
   ausgegeben“ falsch. Was im Rest des Monats schon feststeht, gehört aber
   ins Budget – sonst plant man mit Geld, das bereits vergeben ist.
   Darum: gebucht und verplant werden getrennt gerechnet und getrennt
   angezeigt, auf demselben Mass. */

// Alles, was im gewählten Monat ab morgen noch kommt: erfasste Zukunftsbuchungen
// und Serientermine, nach Rolle getrennt.
function planSplit(jahr, monat) {
  const r = { fix: 0, variabel: 0, ruecklage: 0, ein: 0, n: 0, proArt: {} };
  const ende = monatsEnde(jahr, monat);
  const start = ymKey(jahr, monat) === YM_HEUTE ? addDays(TODAY, 1) : jahr + '-' + String(monat).padStart(2, '0') + '-01';
  if (ende < start) return r;                    // Monat liegt ganz in der Vergangenheit
  geplantAlle(start, ende).forEach(g => {
    const k = katById(g.kategorieId);
    const e = g.typ === 'Übertrag' ? (k ? k.typ : null) : g.typ;
    if (!e || !k) return;                        // Übertrag ohne Kategorie ist budgetneutral
    r.n++;
    if (e === 'Einnahme') { r.ein += g.betrag; return; }
    const art = artVon(k);
    const w = g.betrag * (g.typ === 'Übertrag' && g.gegen ? -1 : 1);
    r.proArt[art.id] = (r.proArt[art.id] || 0) + w;
    if (!art.konsum) r.ruecklage += w;
    else r[art.rolle === 'fix' ? 'fix' : 'variabel'] += w;
  });
  return r;
}

/* ---------------------------------------------------- Farbsignale */

// Eine Zahl wird nur eingefärbt, wenn die Farbe etwas aussagt.
// Grün: Geld kommt herein. Rot: über dem Plan. Bernstein: knapp davor.
function ampel(ist, budget, pace) {
  if (!(budget > 0)) return '';
  const q = ist / budget;
  if (q > 1) return 'neg';
  if (pace != null && q > pace + 0.12) return 'warnc';
  if (q > 0.9) return 'warnc';
  return '';
}

/* ------------------------------------------------- Kontoverlauf */

// Monatsendstände der letzten n Monate, plus heute. Vor dem Stichtag gibt es
// keine Daten, darum beginnt die Reihe frühestens dort.
function kontoVerlauf(a, n) {
  const start = a.typ === 'anlage'
    ? ((staende(a)[0] || {}).datum || a.startdatum || TODAY)
    : (a.startdatum || TODAY);
  const out = [];
  const d = new Date(TODAY + 'T12:00:00');
  for (let i = n - 1; i >= 1; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i + 1, 0);
    const iso = x.toISOString().slice(0, 10);
    if (iso < start) continue;
    out.push({ label: MONATE[x.getMonth()].slice(0, 3), wert: kontoWert(a, iso) });
  }
  out.push({ label: 'heute', wert: kontoWert(a) });
  return out;
}

// Linie über den tatsächlichen Wertebereich. Die Nulllinie erscheint nur,
// wenn der Verlauf sie wirklich kreuzt.
function svgVerlauf(punkte, w, h, farbe) {
  const werte = punkte.map(p => p.wert);
  let max = Math.max(...werte), min = Math.min(...werte);
  if (min > 0 && min < max * 0.4) min = 0;          // kleine Beträge gegen die Null zeigen
  if (max === min) { max += 1; min -= 1; }
  const span = max - min;
  const L = 6, R = 6, T = 10, B = 18, H = h + T + B;
  const xAt = i => L + (punkte.length < 2 ? (w - L - R) / 2 : i * (w - L - R) / (punkte.length - 1));
  const yAt = v => T + h - ((v - min) / span * h);
  let s = '<svg viewBox="0 0 ' + w + ' ' + H + '" role="img">';
  if (min < 0 && max > 0) s += '<line x1="' + L + '" x2="' + (w - R) + '" y1="' + yAt(0) + '" y2="' + yAt(0) +
    '" stroke="currentColor" opacity=".35" stroke-dasharray="3 3"/>';
  s += '<polyline points="' + punkte.map((p, i) => xAt(i) + ',' + yAt(p.wert)).join(' ') +
    '" fill="none" stroke="' + farbe + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  s += '<circle cx="' + xAt(punkte.length - 1) + '" cy="' + yAt(werte[werte.length - 1]) + '" r="3.5" fill="' + farbe + '"/>';
  const step = Math.max(1, Math.ceil(punkte.length / 5));
  punkte.forEach((p, i) => {
    if (i % step && i !== punkte.length - 1) return;
    const letzte = i === punkte.length - 1;
    const anker = i === 0 ? 'start' : (letzte ? 'end' : 'middle');
    s += '<text x="' + xAt(i) + '" y="' + (T + h + 14) + '" font-size="10.5" text-anchor="' + anker +
      '" fill="currentColor" opacity=".75">' + esc(p.label) + '</text>';
  });
  return s + '</svg>';
}

/* --------------------------------------------------- Konten-Reiter */

let offenesKonto = null;

function renderKonten() {
  const bis = addDays(TODAY, 30);
  $('vermHeute').textContent = fmtCHF(vermoegenAnzeige());
  const pro = vermoegenPrognose(bis);
  const pEl = $('vermPrognose');
  pEl.textContent = fmtCHF(pro);
  pEl.className = 'small ' + (pro < vermoegenAnzeige() ? 'neg' : 'planc');

  $('kontenSaldi').innerHTML = state.konten.map(a => {
    const w = kontoWert(a), p = kontoPrognose(a, bis), res = a.typ === 'anlage' ? 0 : reserviert(a);
    const offen = offenesKonto === a.id;
    const frei = w - res;
    // Kurzzeile: der Stand und, wenn es etwas zu sagen gibt, ein zweiter Wert
    let unter;
    if (a.typ === 'anlage') {
      const gv = kontoGV(a), stand = letzterStand(a);
      unter = gv === null ? 'noch kein Wert erfasst'
        : '<span class="' + (gv >= 0 ? 'pos' : 'neg') + '">' + (gv >= 0 ? '+' : '') + fmt0(gv) + '</span> seit ' + fmtDatum(stand.datum);
    } else if (res > 0.005) {
      unter = fmt0(res) + ' reserviert · <b>' + fmt0(frei) + ' frei</b>';
    } else {
      const letzte = state.transaktionen.filter(t => t.datum <= TODAY && (t.konto === a.name || t.kontoNach === a.name))
        .reduce((m, t) => t.datum > m ? t.datum : m, '');
      unter = letzte ? 'zuletzt bewegt ' + fmtDatum(letzte) : 'seit ' + fmtDatum(a.startdatum) + ' keine Buchung';
    }
    const detail = offen ? kontoDetail(a, w, p, res) : '';
    return '<div class="acc' + (offen ? ' open' : '') + '">' +
      '<div class="listrow" data-kt="' + esc(a.id) + '" style="cursor:pointer">' +
      '<div class="l"><div><b>' + esc(a.name) + '</b>' +
      (a.typ === 'anlage' ? ' <span class="tag rep">Anlage</span>' : '') + '</div>' +
      '<div class="small">' + unter + '</div></div>' +
      '<div class="num"><div class="mid' + (w < 0 ? ' neg' : '') + '">' + fmtCHF(w) + '</div>' +
      '<div class="small ' + (p < w ? 'neg' : 'planc') + '">' + (Math.abs(p - w) > 0.005 ? '→ ' + fmt0(p) : '') + '</div></div>' +
      '<span class="chev">' + (offen ? '⌃' : '⌄') + '</span></div>' + detail + '</div>';
  }).join('') || '<p class="small">Noch keine Konten.</p>';

  qsa('[data-kt]').forEach(el => el.onclick = () => {
    offenesKonto = offenesKonto === el.dataset.kt ? null : el.dataset.kt;
    renderKonten();
  });
  qsa('[data-ke]').forEach(el => el.onclick = (e) => { e.stopPropagation(); editKonto(el.dataset.ke); });
  qsa('[data-kd]').forEach(el => el.onclick = (e) => { e.stopPropagation(); delKonto(el.dataset.kd); });

  // Liquidität: was ist wirklich frei?
  const liq0 = liquidTotal(), res0 = reserviertTotal();
  $('liquiBox').innerHTML = res0 > 0.005
    ? '<div class="listrow" style="border-top:2px solid var(--border);border-bottom:none">' +
      '<div class="l"><div><b>Frei verfügbar</b></div>' +
      '<div class="small">liquide ' + fmt0(liq0) + ' minus ' + fmt0(res0) + ' in Töpfen</div></div>' +
      '<div class="num mid ' + (liq0 - res0 >= 0 ? '' : 'neg') + '">' + fmtCHF(liq0 - res0) + '</div></div>'
    : '';

  const liste = geplantAlle(addDays(TODAY, 1), addDays(TODAY, 90));
  let lauf = liquidTotal();
  const liq = n => { const a = kontoByName(n); return !!a && a.typ !== 'anlage'; };
  const kEin=liste.filter(g=>g.typ==='Einnahme').reduce((s,g)=>s+g.betrag,0);
  const kAus=liste.filter(g=>g.typ==='Ausgabe').reduce((s,g)=>s+g.betrag,0);
  $('kommSum').textContent = liste.length ? liste.length + ' · ' + fmt0(kEin-kAus) : 'nichts geplant';
  $('kommend').innerHTML = liste.map(g => {
    // Ein Übertrag auf ein Anlagekonto senkt das frei verfügbare Geld, auch wenn das Vermögen gleich bleibt
    if (g.typ === 'Einnahme') { if (liq(g.konto)) lauf += g.betrag; }
    else if (g.typ === 'Ausgabe') { if (liq(g.konto)) lauf -= g.betrag; }
    else { if (liq(g.konto)) lauf -= g.betrag; if (liq(g.kontoNach)) lauf += g.betrag; }
    return txZeile(g, '<div class="tx-s ' + (lauf < 0 ? 'neg' : '') + '">Liquide danach: ' + fmt0(lauf) + '</div>');
  }).join('') || '<p class="small">Nichts geplant in den nächsten 90 Tagen.</p>';

  renderToepfe(); renderWert(); renderVermoegen();
}

function kontoDetail(a, w, p, res) {
  const punkte = kontoVerlauf(a, 12);
  const toepfeHier = toepfe().filter(t => t.kontoId === a.id);
  const genugDaten = punkte.length >= 3 && Math.max(...punkte.map(x => x.wert)) !== Math.min(...punkte.map(x => x.wert));
  const delta = w - punkte[0].wert;
  let kopf;
  if (genugDaten) {
    kopf = '<div class="chartwrap" style="color:var(--text-dim)">' + svgVerlauf(punkte, 320, 72, 'var(--accent-fill)') + '</div>' +
      '<p class="small"><span class="' + (delta >= 0 ? 'pos' : 'neg') + '">' + (delta >= 0 ? '+' : '') + fmt0(delta) +
      '</span> seit ' + esc(punkte[0].label) + '</p>';
  } else {
    kopf = '<p class="small">Für einen Verlauf fehlen noch Daten. Er entsteht ab dem Stichtag ' +
      fmtDatum(a.typ === 'anlage' ? ((staende(a)[0] || {}).datum || a.startdatum) : a.startdatum) + ' von selbst.</p>';
  }
  let zeilen = '';
  if (a.typ === 'anlage') {
    const e = kontoEinstand(a), gv = kontoGV(a), st = letzterStand(a);
    zeilen += '<div class="kv"><span>Eingezahlt</span><span>' + fmtCHF(e) + '</span></div>';
    if (gv !== null) zeilen += '<div class="kv"><span>Gewinn/Verlust</span><span class="' + (gv >= 0 ? 'pos' : 'neg') + '">' +
      (gv >= 0 ? '+' : '') + fmtCHF(gv) + '</span></div>' +
      '<div class="kv"><span>Wert erfasst am</span><span>' + fmtDatum(st.datum) + '</span></div>';
    else zeilen += '<div class="kv"><span>Aktueller Wert</span><span class="warnc">noch nicht erfasst</span></div>';
  } else {
    zeilen += '<div class="kv"><span>Startsaldo</span><span>' + fmtCHF(a.startsaldo || 0) + ' per ' + fmtDatum(a.startdatum) + '</span></div>';
    if (res > 0.005) {
      zeilen += '<div class="kv"><span>In Töpfen reserviert</span><span>' + fmtCHF(res) + '</span></div>';
      toepfeHier.forEach(t => zeilen += '<div class="kv"><span class="small">· ' + esc(t.name) + '</span><span class="small">' + fmtCHF(topfStand(t)) + '</span></div>');
      zeilen += '<div class="kv"><span><b>Frei</b></span><span><b class="' + (w - res < 0 ? 'neg' : '') + '">' + fmtCHF(w - res) + '</b></span></div>';
    }
  }
  zeilen += '<div class="kv"><span>In 30 Tagen</span><span class="' + (p < w ? 'neg' : 'planc') + '">' + fmtCHF(p) + '</span></div>';
  return '<div class="accdet">' + kopf + zeilen +
    '<div class="btnrow" style="margin-top:10px"><button class="small-btn" data-ke="' + esc(a.id) + '">Bearbeiten</button>' +
    '<button class="small-btn danger" data-kd="' + esc(a.id) + '">Löschen</button></div></div>';
}

/* --------------------------------------------------- Sparziele */

function renderZiele() {
  const sel = $('zKonto'), prev = sel.value;
  sel.innerHTML = '<option value="">Gesamtvermögen</option>' +
    state.konten.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>').join('') +
    toepfe().map(t => '<option value="tp:' + esc(t.id) + '">Topf · ' + esc(t.name) + '</option>').join('');
  sel.value = prev;
  const rate = sparrate();
  $('sparInfo').textContent = rate
    ? 'Sparrate ' + fmtCHF(rate) + ' pro Monat: Einnahmen minus Konsum, gemittelt über die letzten 6 abgeschlossenen Monate mit Buchungen. Rücklagen zählen nicht als Konsum.'
    : 'Sparrate noch unbekannt: dafür braucht es Buchungen aus abgeschlossenen Monaten.';

  $('zieleListe').innerHTML = state.ziele.map(z => {
    const ist = zielStand(z), ziel = +z.betrag || 0;
    const pct = ziel ? Math.min(100, Math.max(0, ist / ziel * 100)) : 0;
    const fehlt = Math.max(0, ziel - ist);
    const erreicht = fehlt <= 0;
    let kopf, zusatz = '', cls = 'none', tick = '';
    if (erreicht) { kopf = 'erreicht'; cls = ''; }
    else if (z.datum) {
      // Mit Zieldatum: nötige Rate gegen die tatsächliche Sparrate stellen
      const mo = Math.max(1, Math.round((new Date(z.datum) - new Date(TODAY)) / (1000 * 3600 * 24 * 30.44)));
      const noetig = fehlt / mo;
      const schafft = rate >= noetig;
      kopf = fmtCHF(noetig) + ' pro Monat nötig';
      zusatz = rate > 0
        ? (schafft ? 'Deine Sparrate von ' + fmt0(rate) + ' reicht.' : 'Deine Sparrate liegt bei ' + fmt0(rate) + ' – es fehlen ' + fmt0(noetig - rate) + ' pro Monat.')
        : 'Sparrate noch unbekannt.';
      if (rate > 0 && !schafft) cls = 'over';
      // Marke: wo müsstest du bei gleichmässigem Sparen heute stehen?
      const gesamtMo = Math.max(1, Math.round((new Date(z.datum) - new Date(z.seit || TODAY)) / (1000 * 3600 * 24 * 30.44)));
      void gesamtMo;
    } else if (rate > 0) {
      const mo = Math.ceil(fehlt / rate);
      kopf = 'erreicht in ' + mo + ' Monaten';
      zusatz = 'bei ' + fmtCHF(rate) + ' pro Monat, also etwa ' + fmtDatum(addMonths(TODAY, mo));
    } else { kopf = 'noch ' + fmt0(fehlt); zusatz = 'Sparrate noch unbekannt.'; }

    return '<div class="grpblock">' +
      '<div class="bl"><span class="gt">' + esc(z.name) + '</span>' +
      '<span><b class="' + (erreicht ? 'pos' : '') + '">' + fmt0(ist) + '</b> / ' + fmt0(ziel) + '</span></div>' +
      '<div class="bar"><div class="f ' + cls + '" style="width:' + pct + '%"></div>' + tick + '</div>' +
      '<div class="bl" style="margin-top:6px"><span class="lbl">' + Math.round(pct) + ' %' + (erreicht ? '' : ' · noch ' + fmt0(fehlt)) + '</span>' +
      '<span class="' + (erreicht ? 'pos' : (cls === 'over' ? 'neg' : '')) + '">' + kopf + '</span></div>' +
      (zusatz ? '<div class="small" style="margin-top:2px">' + zusatz + '</div>' : '') +
      '<div class="btnrow" style="margin-top:8px"><button class="small-btn" data-ze="' + esc(z.id) + '">Bearb.</button>' +
      '<button class="small-btn danger" data-zd="' + esc(z.id) + '">Löschen</button></div></div>';
  }).join('') || '<p class="small">Noch keine Ziele. Typisch: Eigenkapital Wohnung, Auto, Notgroschen. Ein Ziel kann auch den Stand eines Topfes ablesen.</p>';

  qsa('[data-ze]').forEach(el => el.onclick = () => {
    const z = state.ziele.find(z => z.id === el.dataset.ze); editingZiel = z.id;
    $('zName').value = z.name; $('zBetrag').value = z.betrag; $('zDatum').value = z.datum || ''; $('zKonto').value = z.kontoId || '';
    $('btnCancelZiel').classList.remove('hidden'); formOeffnen('zName', z.name);
  });
  qsa('[data-zd]').forEach(el => el.onclick = async () => {
    if (!confirm('Ziel löschen?')) return;
    state.ziele = state.ziele.filter(z => z.id !== el.dataset.zd); await saveData(); renderAll();
  });
}

// Ein Ziel kann am Gesamtvermögen, an einem Konto oder an einem Topf hängen.
function zielStand(z) {
  if (z.kontoId && String(z.kontoId).startsWith('tp:')) {
    const t = topfById(String(z.kontoId).slice(3));
    return t ? topfStand(t) : 0;
  }
  if (z.kontoId) { const a = state.konten.find(a => a.id === z.kontoId); if (a) return kontoWert(a); }
  return vermoegenAnzeige();
}
