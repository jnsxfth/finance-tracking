/* ============================= Geldfluss-Modell =============================
   Bisher kannte die App nur Einnahme und Ausgabe. Damit zählte ein Übertrag auf
   das Sparkonto wie Konsum, und ein Notgroschen sah aus wie frei verfügbares Geld.
   Jede Kategorie gehört darum zu einer Art, und Konten bekommen Töpfe.

   Arten sind Daten, keine festen Werte: der Nutzer legt eigene an. Zwei Angaben
   steuern das Verhalten – die Rolle im Geldfluss und ob es als Ausgabe zählt. */

const ROLLEN = [
  ['fix', 'Planbar', 'Wird vom Einkommen abgezogen, bevor du planst: Miete, Versicherung, Abos.'],
  ['variabel', 'Variabel', 'Was danach übrig bleibt und was du laufend selbst steuerst.'],
  ['ruecklage', 'Rücklage', 'Geld, das du zurücklegst. Es verlässt zwar das Lohnkonto, ist aber nicht ausgegeben.'],
];
const rolleName = (r) => (ROLLEN.find(x => x[0] === r) || ['', '?'])[1];

const ARTEN_STANDARD = [
  { id: 'ein_fix', typ: 'Einnahme', name: 'Festes Einkommen', rolle: 'fix', konsum: false, fest: true },
  { id: 'ein_var', typ: 'Einnahme', name: 'Übriges Einkommen', rolle: 'variabel', konsum: false, fest: true },
  { id: 'fix', typ: 'Ausgabe', name: 'Fixkosten', rolle: 'fix', konsum: true, fest: true },
  { id: 'variabel', typ: 'Ausgabe', name: 'Variable Ausgaben', rolle: 'variabel', konsum: true, fest: true },
  { id: 'sparen', typ: 'Ausgabe', name: 'Sparen', rolle: 'ruecklage', konsum: false },
  { id: 'steuern', typ: 'Ausgabe', name: 'Steuern', rolle: 'ruecklage', konsum: false },
  { id: 'gebunden', typ: 'Ausgabe', name: 'Vorsorge (gebunden)', rolle: 'ruecklage', konsum: false },
];

function arten() {
  if (!Array.isArray(state.arten) || !state.arten.length) state.arten = JSON.parse(JSON.stringify(ARTEN_STANDARD));
  return state.arten;
}
const artenFuer = (typ) => arten().filter(a => a.typ === typ);
const artById = (id) => arten().find(a => a.id === id);
// Jede Kategorie landet immer bei einer gültigen Art, auch wenn eine gelöscht wurde.
function artVon(k) {
  if (!k) return artById('variabel');
  const a = artById(k.art);
  if (a && a.typ === k.typ) return a;
  return artenFuer(k.typ)[0] || ARTEN_STANDARD[k.typ === 'Einnahme' ? 0 : 3];
}
const kArt = (k) => artVon(k).id;
const artName = (k) => artVon(k).name;
const rolleVon = (k) => artVon(k).rolle;
// Zählt diese Kategorie als Konsum, also als echte Ausgabe?
const istKonsum = (k) => !!(k && k.typ === 'Ausgabe' && artVon(k).konsum);
// Alles, was zurückgelegt wird: Sparen, Vorsorge, Steuern, eigene Arten.
const istRuecklage = (k) => !!(k && k.typ === 'Ausgabe' && artVon(k).rolle === 'ruecklage');

// Vorschlag beim ersten Start. Danach entscheidet der Nutzer im Kategorie-Dialog.
const ART_FIX_RE = /^(miete|kvg|vvg|hausrat|haftpflicht|handy|internet|streaming|serafe|ahv|öv-abo|fitness|velo|abo)/i;
function artVorschlag(k) {
  if (k.typ === 'Einnahme') return /lohn|salär|rente/i.test(k.kategorie) ? 'ein_fix' : 'ein_var';
  if (/steuer|gemeinde|bund\b/i.test(k.kategorie)) return 'steuern';
  if (/säule ?3a|3\. ?säule/i.test(k.kategorie)) return 'gebunden';
  if (k.gruppe === 'Reserven & Sparen' || /anlegen|sparen|rückstellung|unvorhergeseh/i.test(k.kategorie)) return 'sparen';
  if (ART_FIX_RE.test(k.kategorie) || /versicherung/i.test(k.gruppe || '')) return 'fix';
  return 'variabel';
}
// Von den alten Textwerten (v13) auf die neuen Art-Kennungen
const ART_ALT = { fix: 'fix', variabel: 'variabel', sparen: 'sparen', gebunden: 'gebunden' };
function artMigrieren(k) {
  if (artById(k.art) && artById(k.art).typ === k.typ) return;
  if (k.typ === 'Einnahme') { k.art = (k.art === 'fix') ? 'ein_fix' : 'ein_var'; return; }
  const neu = ART_ALT[k.art];
  // Steuerkategorien aus "Sparen" herauslösen: sie sind aufgeschobener Konsum, kein Sparen
  k.art = (neu === 'sparen' && /steuer|gemeinde|bund\b/i.test(k.kategorie)) ? 'steuern' : (neu || artVorschlag(k));
}

/* --------------------------------------------------------------- Töpfe */

function toepfe() { return Array.isArray(state.toepfe) ? state.toepfe : (state.toepfe = []); }
const topfById = (id) => toepfe().find(t => t.id === id);
const kontoById = (id) => state.konten.find(a => a.id === id);

// Wie verändert eine Buchung den Topf? Geld in das Konto hinein füllt ihn,
// Geld heraus leert ihn. Entscheidend ist das Konto, zu dem der Topf gehört.
function topfDelta(t, topf) {
  if (t.topfId !== topf.id) return 0;
  const konto = kontoById(topf.kontoId);
  if (!konto) return 0;
  if (t.typ === 'Übertrag') {
    if (t.kontoNach === konto.name) return t.betrag;
    if (t.konto === konto.name) return -t.betrag;
    return 0;
  }
  if (t.konto !== konto.name) return 0;
  return t.typ === 'Einnahme' ? t.betrag : -t.betrag;
}
function topfStand(topf, bis) {
  const grenze = bis || TODAY;
  let s = +topf.start || 0;
  state.transaktionen.forEach(t => { if (t.datum <= grenze) s += topfDelta(t, topf); });
  return Math.round(s * 100) / 100;
}
// Pro Konto: wie viel ist reserviert?
function reserviert(konto) {
  return toepfe().filter(t => t.kontoId === konto.id).reduce((s, t) => s + topfStand(t), 0);
}
function liquideKonten() { return state.konten.filter(a => a.typ !== 'anlage'); }
function liquidTotal() { return liquideKonten().reduce((s, a) => s + kontoWert(a), 0); }
function reserviertTotal() { return liquideKonten().reduce((s, a) => s + reserviert(a), 0); }
function freiVerfuegbar() { return liquidTotal() - reserviertTotal(); }

/* ----------------------------------------------- Summen nach Kategorie-Art */

// Wie ausSplit, aber getrennt nach Art. Rückerstattungen verrechnen sich weiterhin
// nur innerhalb ihrer eigenen Kategorie; was übrig bleibt, steht separat in "ueber".
function artSplit(jahr, monat, bisMonat) {
  const a = agg();
  const von = monat || 1, bis = monat || bisMonat || 12;
  const r = { fix: 0, variabel: 0, ruecklage: 0, aus: 0, ueber: 0, einFix: 0, einVar: 0, ein: 0, proArt: {} };
  arten().forEach(x => r.proArt[x.id] = 0);
  for (const k of state.kategorien) {
    let aus = 0, ein = 0;
    for (let m = von; m <= bis; m++) {
      aus += a['Ausgabe|' + jahr + '|' + m + '|' + k.id] || 0;
      ein += a['Einnahme|' + jahr + '|' + m + '|' + k.id] || 0;
    }
    if (aus) {
      if (aus < 0) r.ueber -= aus;
      else {
        const art = k.typ === 'Ausgabe' ? artVon(k) : artById('variabel');
        r.proArt[art.id] = (r.proArt[art.id] || 0) + aus;
        if (art.konsum) r[art.rolle === 'fix' ? 'fix' : 'variabel'] += aus;
        else r.ruecklage += aus;
      }
    }
    if (ein) {
      const art = k.typ === 'Einnahme' ? artVon(k) : artById('ein_var');
      r.proArt[art.id] = (r.proArt[art.id] || 0) + ein;
      if (art.rolle === 'fix') r.einFix += ein; else r.einVar += ein;
    }
  }
  r.aus = r.fix + r.variabel;
  r.sparen = r.ruecklage;          // Name aus v13, damit alter Code weiterläuft
  r.gebunden = 0;
  r.ein = r.einFix + r.einVar;
  return r;
}

// Planlohn: was der Nutzer als festes Monatseinkommen angibt. Ohne Angabe
// nehmen wir die Daueraufträge mit fester Einnahme-Kategorie.
function planLohn() {
  const manuell = +(state.einst && state.einst.lohn) || 0;
  if (manuell > 0) return { wert: manuell, quelle: 'manuell' };
  const ausSerien = state.serien.filter(s => s.aktiv !== false && s.typ === 'Einnahme' &&
    katById(s.kategorieId) && rolleVon(katById(s.kategorieId)) === 'fix')
    .reduce((s, x) => s + serieMonatsBetrag(x), 0);
  if (ausSerien > 0) return { wert: Math.round(ausSerien * 100) / 100, quelle: 'serien' };
  return { wert: 0, quelle: 'keine' };
}

/* ------------------------------------------------------- Geldfluss-Ansicht */

function renderFluss(jahr, monat) {
  const s = artSplit(jahr, monat);
  const pl = planLohn();
  const heute = new Date();
  const lfd = (jahr === heute.getFullYear() && monat === heute.getMonth() + 1);
  const tageImMonat = new Date(jahr, monat, 0).getDate();
  const tagImMonat = lfd ? heute.getDate() : tageImMonat;

  const basis = pl.wert > 0 ? pl.wert : s.einFix;
  const budgetFix = budgetRolle('fix', jahr, monat);
  const budgetVar = budgetRolle('variabel', jahr, monat);
  // Jede Rücklage-Art bekommt eine eigene Zeile: Steuern sind kein Sparen.
  const ruecklagen = artenFuer('Ausgabe').filter(a => a.rolle === 'ruecklage')
    .map(a => ({ art: a, budget: budgetArt(a.id, jahr, monat), ist: s.proArt[a.id] || 0 }))
    .filter(x => x.budget > 0.005 || x.ist > 0.005);
  const budgetRueck = ruecklagen.reduce((x, r) => x + r.budget, 0);
  const fuerVariables = basis + s.einVar - budgetFix - budgetRueck;
  const verbraucht = s.variabel - s.ueber;
  const nochFrei = fuerVariables - verbraucht;

  // Was im Rest des Monats bereits feststeht: erfasste Zukunftsbuchungen und Serientermine
  const plan = planSplit(jahr, monat);
  const nochOffen = Math.max(0, nochFrei - plan.variabel);

  // Das Mass: gebucht fest, verplant halbtransparent, dazu die Heute-Marke
  const basisMass = Math.max(fuerVariables, verbraucht + plan.variabel, 1);
  const pctIst = Math.max(0, Math.min(100, verbraucht / basisMass * 100));
  const pctPlan = Math.max(0, Math.min(100 - pctIst, plan.variabel / basisMass * 100));
  const pace = (tagImMonat / tageImMonat) * 100;
  const ueber = verbraucht + plan.variabel > fuerVariables;
  const cls = verbraucht > fuerVariables ? 'over' : (ueber || pctIst > pace + 12 ? 'warn' : '');
  const restTage = lfd ? tageImMonat - heute.getDate() + 1 : 0;

  // Geplanter Betrag gross, tatsächlich gebuchter klein darunter: beide in einer Spalte,
  // damit Plan und Ist direkt übereinander vergleichbar sind.
  const frow = (label, wert, sub, extra) =>
    '<div class="frow' + (extra || '') + '"><div class="fl">' + esc(label) + '</div>' +
    '<div class="fv"><b class="' + (wert < 0 ? 'neg' : '') + '">' + fmtCHF(wert) + '</b>' +
    (sub ? '<span class="fs">' + esc(sub) + '</span>' : '') + '</div></div>';

  $('flussInfo').textContent = pl.wert > 0
    ? 'Geplant mit ' + fmtCHF(pl.wert) + ' festem Einkommen pro Monat' + (pl.quelle === 'serien' ? ', abgeleitet aus deinen Daueraufträgen' : '') + '.'
    : 'Noch kein Planlohn hinterlegt. Gerechnet wird mit dem bereits gebuchten festen Einkommen.';

  $('flussBox').innerHTML =
    '<div class="hero">' +
      '<div class="hv ' + (nochOffen > 0 ? '' : 'neg') + '">' + fmtCHF(nochOffen) + '</div>' +
      '<div class="hk">' + (nochOffen > 0 ? 'noch frei im ' : 'über dem Plan für ') + MONATE[monat - 1] +
        (plan.variabel > 0.005 ? ', Verplantes abgezogen' : '') + '</div>' +
      '<div class="bar"><div class="f ' + cls + '" style="width:' + pctIst + '%"></div>' +
      (pctPlan > 0 ? '<div class="p" style="left:' + pctIst + '%;width:' + pctPlan + '%"></div>' : '') +
      (lfd ? '<i class="tick" style="left:' + pace + '%"></i>' : '') + '</div>' +
      '<div class="hf"><span><b>' + fmt0(verbraucht) + '</b> gebucht' +
      (plan.variabel > 0.005 ? ' · <b>' + fmt0(plan.variabel) + '</b> verplant' : ' von ' + fmt0(fuerVariables)) + '</span>' +
      (lfd ? '<span><b>' + restTage + '</b> Tage · ' + fmt0(restTage > 0 ? nochOffen / restTage : 0) + '/Tag</span>' : '') +
      '</div></div>' +
    '<div class="fluss">' +
      frow('Festes Einkommen', basis, pl.wert > 0 ? 'gebucht ' + fmt0(s.einFix) : null) +
      (s.einVar ? frow('Übriges Einkommen', s.einVar, 'gebucht') : '') +
      frow('− Fixkosten', budgetFix, 'gebucht ' + fmt0(s.fix) + (plan.fix > 0.005 ? ', verplant ' + fmt0(plan.fix) : '')) +
      ruecklagen.map(r => frow('− ' + r.art.name, r.budget, 'gebucht ' + fmt0(r.ist) + ((plan.proArt[r.art.id] || 0) > 0.005 ? ', verplant ' + fmt0(plan.proArt[r.art.id]) : ''))).join('') +
      frow('Für Variables da', fuerVariables, 'Budget ' + fmt0(budgetVar), ' sum' + (fuerVariables < 0 ? ' neg' : '')) +
      frow('− Variable Ausgaben', s.variabel, plan.variabel > 0.005 ? 'dazu ' + fmt0(plan.variabel) + ' verplant' : null) +
      (s.ueber > 0.005 ? frow('+ Erstattet ohne Ausgabe', s.ueber, 'aus früheren Monaten') : '') +
      frow('Frei auf den Konten', freiVerfuegbar(),
        reserviertTotal() > 0.005 ? fmt0(reserviertTotal()) + ' in Töpfen reserviert' : null) +
    '</div>' +
    (budgetFix + budgetRueck + budgetVar > basis + s.einVar + 0.5
      ? '<p class="small neg" style="margin-top:12px">Deine Budgets summieren sich auf ' + fmt0(budgetFix + budgetRueck + budgetVar) +
        ' pro Monat und übersteigen damit dein Einkommen von ' + fmt0(basis + s.einVar) + '.</p>' : '');
}

// Budgetsumme aller Kategorien einer Art im gewählten Monat
function budgetArt(artId, jahr, monat) {
  return state.kategorien
    .filter(k => k.typ === 'Ausgabe' && kArt(k) === artId)
    .reduce((s, k) => s + bM(k, jahr, monat), 0);
}
// Budgetsumme aller Ausgabe-Arten mit einer bestimmten Rolle
function budgetRolle(rolle, jahr, monat) {
  return state.kategorien
    .filter(k => k.typ === 'Ausgabe' && rolleVon(k) === rolle)
    .reduce((s, k) => s + bM(k, jahr, monat), 0);
}

$('btnLohnSet').onclick = async () => {
  const jetzt = +(state.einst.lohn || 0);
  const v = prompt('Festes Nettoeinkommen pro Monat (CHF).\n\n0 = aus den Daueraufträgen ableiten.', jetzt || '');
  if (v === null) return;
  const n = rechne(v);
  if (n === null || n < 0) { showMsg('err', 'Betrag nicht lesbar.'); return; }
  state.einst.lohn = n;
  await saveData(); renderAll();
  showMsg('ok', n > 0 ? 'Planlohn ' + fmtCHF(n) + ' gesetzt.' : 'Planlohn gelöscht – es zählen die Daueraufträge.');
};

/* ---------------------------------------------------- Töpfe verwalten (UI) */

let editingTopf = null;

function fillTopfKonto() {
  const sel = $('tpKonto'), prev = sel.value;
  sel.innerHTML = liquideKonten().map(a => '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>').join('');
  if (liquideKonten().some(a => a.id === prev)) sel.value = prev;
}

function renderToepfe() {
  fillTopfKonto();
  const liste = toepfe();
  $('topfListe').innerHTML = liste.map(t => {
    const k = kontoById(t.kontoId), stand = topfStand(t), ziel = +t.ziel || 0;
    const pct = ziel ? Math.min(100, stand / ziel * 100) : 0;
    return '<div class="grpblock"><div class="bl"><span class="gt">' + esc(t.name) + '</span>' +
      '<span><b>' + fmt0(stand) + '</b>' + (ziel ? ' / ' + fmt0(ziel) : '') + '</span></div>' +
      (ziel ? '<div class="bar"><div class="f' + (stand >= ziel ? '' : ' none') + '" style="width:' + pct + '%"></div></div>' : '') +
      '<div class="small" style="margin-top:4px">in ' + esc(k ? k.name : 'Konto fehlt') +
      (ziel && stand < ziel ? ' · noch ' + fmt0(ziel - stand) : '') + '</div>' +
      '<div class="btnrow" style="margin-top:6px"><button class="small-btn" data-tpe="' + esc(t.id) + '">Bearb.</button>' +
      '<button class="small-btn danger" data-tpd="' + esc(t.id) + '">Löschen</button></div></div>';
  }).join('') || '<p class="small">Noch keine Töpfe. Typisch: Notgroschen, Steuern, Ferien.</p>';

  qsa('[data-tpe]').forEach(el => el.onclick = () => {
    const t = topfById(el.dataset.tpe); if (!t) return;
    editingTopf = t.id; $('tpName').value = t.name; $('tpKonto').value = t.kontoId;
    $('tpStart').value = t.start || ''; $('tpZiel').value = t.ziel || '';
    $('btnCancelTopf').classList.remove('hidden');
    $('tpName').scrollIntoView({ block: 'center' });
  });
  qsa('[data-tpd]').forEach(el => el.onclick = async () => {
    const t = topfById(el.dataset.tpd); if (!t) return;
    const n = state.transaktionen.filter(x => x.topfId === t.id).length;
    if (!confirm('Topf „' + t.name + '“ löschen?' + (n ? '\n\n' + n + ' Buchungen verlieren ihre Zuordnung. Die Buchungen selbst bleiben.' : ''))) return;
    state.transaktionen.forEach(x => { if (x.topfId === t.id) delete x.topfId; });
    state.serien.forEach(x => { if (x.topfId === t.id) delete x.topfId; });
    state.toepfe = toepfe().filter(x => x.id !== t.id);
    resetTopfForm(); await saveData(); renderAll(); showMsg('ok', 'Topf gelöscht.');
  });
}

function resetTopfForm() {
  editingTopf = null;
  $('tpName').value = ''; $('tpStart').value = ''; $('tpZiel').value = '';
  $('btnCancelTopf').classList.add('hidden');
}
$('btnCancelTopf').onclick = resetTopfForm;

$('btnSaveTopf').onclick = async () => {
  const name = $('tpName').value.trim(), kontoId = $('tpKonto').value;
  if (!name) { showMsg('err', 'Name ausfüllen.'); return; }
  if (!kontoId) { showMsg('err', 'Kein liquides Konto vorhanden.'); return; }
  const start = rechne($('tpStart').value || '0'), ziel = rechne($('tpZiel').value || '0');
  if (start === null || ziel === null) { showMsg('err', 'Betrag nicht lesbar.'); return; }
  if (toepfe().some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== editingTopf)) {
    showMsg('err', 'Ein Topf mit diesem Namen existiert schon.'); return;
  }
  if (editingTopf) Object.assign(topfById(editingTopf), { name, kontoId, start, ziel });
  else toepfe().push({ id: 'tp' + Date.now() + Math.random(), name, kontoId, start, ziel });
  resetTopfForm(); await saveData(); renderAll(); showMsg('ok', 'Topf gespeichert.');
};

// Topf-Auswahl in den Formularen: nur Töpfe, die zu einem beteiligten Konto gehören.
function fillTopfSelect(selId, modus, konto, kontoNach) {
  const sel = $(selId); if (!sel) return;
  const namen = modus === 'Übertrag' ? [konto, kontoNach] : [konto];
  const passend = toepfe().filter(t => { const k = kontoById(t.kontoId); return k && namen.includes(k.name); });
  const prev = sel.value;
  sel.innerHTML = '<option value="">– kein Topf –</option>' + passend.map(t => {
    const k = kontoById(t.kontoId);
    const richtung = modus === 'Übertrag' ? (k.name === kontoNach ? ' (füllen)' : ' (leeren)') : '';
    return '<option value="' + esc(t.id) + '">' + esc(t.name) + ' · ' + esc(k.name) + richtung + '</option>';
  }).join('');
  if (passend.some(t => t.id === prev)) sel.value = prev;
  const row = $(selId === 'txTopf' ? 'rowTopf' : 'serRowTopf');
  if (row) row.classList.toggle('hidden', !passend.length);
}

/* ------------------------------------------------- Kategorie-Art im Dialog */

function fillCatArt(typ, sel) {
  const s = $('catArt');
  const liste = artenFuer(typ);
  s.innerHTML = liste.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>').join('');
  s.value = liste.some(a => a.id === sel) ? sel : (liste[0] || {}).id || '';
  catArtHint();
}
function catArtHint() {
  const a = artById($('catArt').value);
  $('catArtHint').textContent = a
    ? rolleName(a.rolle) + ' · ' + (a.konsum ? 'zählt als Ausgabe' : 'zählt nicht als Ausgabe') +
      ' · ' + (ROLLEN.find(r => r[0] === a.rolle) || ['', '', ''])[2]
    : '';
}
$('catArt').onchange = catArtHint;

/* ------------------------------------------------------- Arten verwalten */

let editingArt = null;

function artenInUse(id) { return state.kategorien.filter(k => k.art === id).length; }

function renderArten() {
  $('artenListe').innerHTML = ['Ausgabe', 'Einnahme'].map(typ => {
    const liste = artenFuer(typ);
    if (!liste.length) return '';
    return '<div class="grpblock"><div class="gt">' + (typ === 'Ausgabe' ? 'Ausgaben' : 'Einnahmen') + '</div>' +
      liste.map(a => '<div class="listrow" data-ar="' + esc(a.id) + '" style="cursor:pointer"><div class="l">' +
        '<div>' + esc(a.name) + (a.fest ? ' <span class="tag rep">fest</span>' : '') + '</div>' +
        '<div class="small">' + rolleName(a.rolle) + ' · ' + (a.konsum ? 'zählt als Ausgabe' : 'zählt nicht als Ausgabe') +
        ' · ' + artenInUse(a.id) + ' Kategorien</div></div><span class="small">›</span></div>').join('') + '</div>';
  }).join('');
  qsa('#artenListe [data-ar]').forEach(el => el.onclick = () => openArt(el.dataset.ar));
}

function openArt(id) {
  editingArt = id || null;
  const a = id ? artById(id) : null;
  $('artName').value = a ? a.name : '';
  $('artTyp').value = a ? a.typ : 'Ausgabe';
  $('artRolle').value = a ? a.rolle : 'ruecklage';
  $('artKonsum').checked = a ? !!a.konsum : false;
  $('artTyp').disabled = !!a;
  $('artDlgTitle').textContent = a ? 'Art bearbeiten' : 'Neue Art';
  $('btnDelArt').classList.toggle('hidden', !a || a.fest);
  artDlgHint();
  $('artDlg').showModal();
}
function artDlgHint() {
  const r = ROLLEN.find(x => x[0] === $('artRolle').value);
  $('artRolleHint').textContent = r ? r[2] : '';
  $('rowArtKonsum').classList.toggle('hidden', $('artTyp').value === 'Einnahme');
  $('artKonsumHint').textContent = $('artTyp').value === 'Einnahme'
    ? 'Einnahme-Arten zählen nie als Ausgabe.'
    : ($('artKonsum').checked
      ? 'Gilt als echter Konsum: fliesst in Ausgabensumme, Budgetbalken und Sparquote ein.'
      : 'Gilt als zurückgelegtes Geld: eigene Zeile im Geldfluss, nicht in der Ausgabensumme.');
}
$('artRolle').onchange = artDlgHint;
$('artKonsum').onchange = artDlgHint;
$('btnNeueArt').onclick = () => openArt(null);
$('btnCloseArt').onclick = () => $('artDlg').close();

$('btnSaveArt').onclick = async () => {
  const name = $('artName').value.trim();
  if (!name) { showMsg('err', 'Name ausfüllen.'); return; }
  const typ = $('artTyp').value, rolle = $('artRolle').value;
  const konsum = typ === 'Einnahme' ? false : $('artKonsum').checked;
  if (arten().some(a => a.typ === typ && a.name.toLowerCase() === name.toLowerCase() && a.id !== editingArt)) {
    showMsg('err', 'Eine Art mit diesem Namen existiert schon.'); return; }
  if (editingArt) {
    const a = artById(editingArt);
    // Rolle und Verhalten der festen Arten bleiben, damit der Geldfluss nicht kippt
    if (a.fest) Object.assign(a, { name });
    else Object.assign(a, { name, rolle, konsum });
  } else {
    arten().push({ id: 'ar' + Date.now() + Math.random().toString(36).slice(2, 6), typ, name, rolle, konsum });
  }
  $('artDlg').close(); aggInvalidate(); ROLLC = null;
  await saveData(); renderAll(); showMsg('ok', 'Art gespeichert.');
};

$('btnDelArt').onclick = async () => {
  const a = artById(editingArt); if (!a || a.fest) return;
  const n = artenInUse(a.id);
  // Ersatz: zuerst eine andere Art mit derselben Rolle, sonst die feste Standard-Art
  const ziel = arten().find(x => x.typ === a.typ && x.id !== a.id && x.rolle === a.rolle)
    || artenFuer(a.typ).find(x => x.fest && x.rolle === 'variabel')
    || artenFuer(a.typ).find(x => x.id !== a.id);
  if (!confirm('Art „' + a.name + '“ löschen?' + (n ? '\n\n' + n + ' Kategorien wechseln zu „' + ziel.name + '“.' : ''))) return;
  state.kategorien.forEach(k => { if (k.art === a.id) k.art = ziel.id; });
  state.arten = arten().filter(x => x.id !== a.id);
  $('artDlg').close(); aggInvalidate(); ROLLC = null;
  await saveData(); renderAll(); showMsg('ok', 'Art gelöscht.');
};
