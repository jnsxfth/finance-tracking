/* ===================== Plan und Mustererkennung =====================
   Zwei Fragen: Was passiert mit meinem Budget, wenn sich der Lohn ändert?
   Und: Was kommt regelmässig, ohne dass ein Dauerauftrag dafür besteht? */

/* ------------------------------------------------- Planszenario */

function planRechnung(lohn, jahr, monat) {
  const fix = budgetRolle('fix', jahr, monat);
  const vari = budgetRolle('variabel', jahr, monat);
  const rueckArten = artenFuer('Ausgabe').filter(a => a.rolle === 'ruecklage')
    .map(a => ({ art: a, budget: budgetArt(a.id, jahr, monat) })).filter(x => x.budget > 0.005);
  const rueck = rueckArten.reduce((s, r) => s + r.budget, 0);
  return { fix, vari, rueck, rueckArten, rest: lohn - fix - rueck - vari, lohn };
}

function renderPlan() {
  const jahr = +$('dashJahr').value, monat = +$('dashMonat').value;
  const pl = planLohn();
  const eingabe = rechne($('planLohn').value);
  const lohn = eingabe !== null && eingabe > 0 ? eingabe : pl.wert;
  if (!lohn) {
    $('planBox').innerHTML = '<p class="small">Trage einen Monatslohn ein, um zu sehen, wie er sich auf deine Budgets verteilt.</p>';
    return;
  }
  const r = planRechnung(lohn, jahr, monat);
  const jetzt = pl.wert ? planRechnung(pl.wert, jahr, monat) : null;
  const anteil = (v) => Math.round(v / lohn * 1000) / 10;

  // Woran liesse sich drehen? Die grössten variablen Budgets zuerst.
  const kandidaten = state.kategorien
    .filter(k => k.typ === 'Ausgabe' && rolleVon(k) === 'variabel' && bM(k, jahr, monat) > 0)
    .map(k => ({ k, b: bM(k, jahr, monat) }))
    .sort((a, b) => b.b - a.b).slice(0, 4);

  const zeile = (label, wert, sub) =>
    '<div class="frow"><div class="fl">' + esc(label) + '</div><div class="fv">' +
    '<b class="' + (wert < 0 ? 'neg' : '') + '">' + fmtCHF(wert) + '</b>' +
    '<span class="fs">' + esc(sub) + '</span></div></div>';

  let rat;
  if (r.rest < -0.5) {
    rat = '<p class="small neg" style="margin-top:12px">Mit ' + fmt0(lohn) + ' fehlen dir ' + fmt0(-r.rest) +
      ' pro Monat. Diese Budgets sind die grössten Hebel: ' +
      kandidaten.map(c => esc(c.k.kategorie) + ' (' + fmt0(c.b) + ')').join(', ') + '.</p>' +
      '<p class="small">Eine gleichmässige Kürzung aller variablen Budgets um ' +
      Math.ceil(-r.rest / Math.max(1, r.vari) * 100) + ' % würde reichen.</p>';
  } else if (r.rest > 0.5) {
    const spar = r.rueckArten[0];
    rat = '<p class="small" style="margin-top:12px">Es bleiben ' + fmt0(r.rest) +
      ' pro Monat ungeplant, also ' + anteil(r.rest) + ' % des Lohns. ' +
      (spar ? 'Du könntest „' + esc(spar.art.name) + '“ von ' + fmt0(spar.budget) + ' auf ' +
        fmt0(spar.budget + r.rest) + ' erhöhen.' : 'Lege eine Rücklage-Kategorie an, damit das Geld einen Zweck bekommt.') + '</p>';
  } else {
    rat = '<p class="small" style="margin-top:12px">Lohn und Budgets gehen genau auf.</p>';
  }

  $('planBox').innerHTML =
    zeile('Lohn', lohn, jetzt ? 'heute geplant ' + fmt0(pl.wert) : 'angenommen') +
    zeile('− Fixkosten', r.fix, anteil(r.fix) + ' % vom Lohn') +
    r.rueckArten.map(x => zeile('− ' + x.art.name, x.budget, anteil(x.budget) + ' %')).join('') +
    zeile('− Variable Budgets', r.vari, anteil(r.vari) + ' %') +
    '<div class="frow sum"><div class="fl"><b>' + (r.rest >= 0 ? 'Ungeplant übrig' : 'Fehlbetrag') + '</b></div>' +
    '<div class="fv"><b class="' + (r.rest >= 0 ? 'pos' : 'neg') + '">' + fmtCHF(r.rest) + '</b>' +
    '<span class="fs">' + anteil(r.rest) + ' % vom Lohn</span></div></div>' + rat;
}

/* ---------------------------------------------- Mustererkennung */

const normTitel = (s) => (s || '').toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
const maxDat = (a, b) => a > b ? a : b;
const worte = (s) => new Set(normTitel(s).split(/[^a-zäöüéèàç]+/).filter(w => w.length >= 3));

// Deckt ein bestehender Dauerauftrag diesen Posten schon ab? Titel werden selten
// gleich geschrieben, darum zählt die Überschneidung bedeutsamer Wörter plus
// dieselbe Kategorie.
function schonAbgedeckt(titel, kategorieId) {
  const w = worte(titel);
  return state.serien.some(s => {
    if (s.aktiv === false) return false;
    if (normTitel(s.titel) === normTitel(titel)) return true;
    if (s.kategorieId !== kategorieId) return false;
    const sw = worte(s.titel);
    for (const x of w) if (sw.has(x)) return true;
    return false;
  });
}

// Gleichmässige Wiederholungen in der Historie finden, für die noch kein
// Dauerauftrag besteht. Erkannt wird über den Median der Abstände. Posten, die
// erkennbar aufgehört haben, bleiben draussen.
function muster() {
  const g = {};
  state.transaktionen.forEach(t => {
    if (t.datum > TODAY || !t.titel || t.typ === 'Übertrag') return;
    const key = normTitel(t.titel) + '|' + (t.kategorieId || '');
    (g[key] || (g[key] = [])).push(t);
  });
  const out = [];
  Object.values(g).forEach(liste => {
    if (liste.length < 3) return;
    liste.sort((a, b) => a.datum.localeCompare(b.datum));
    const letzte = liste[liste.length - 1];
    if (schonAbgedeckt(letzte.titel, letzte.kategorieId)) return;
    const tage = liste.map(t => Math.round(new Date(t.datum) / 86400000));
    const abst = tage.slice(1).map((d, i) => d - tage[i]).filter(d => d > 0);
    if (abst.length < 2) return;
    const sortiert = abst.slice().sort((a, b) => a - b);
    const med = sortiert[Math.floor(sortiert.length / 2)];
    if (med < 20 || med > 400) return;
    const abw = abst.reduce((s, d) => s + Math.abs(d - med), 0) / abst.length;
    if (abw / med > 0.35) return;
    // Ist der Posten noch aktiv? Zwei ausgelassene Termine gelten als beendet.
    const seit = Math.round((new Date(TODAY) - new Date(letzte.datum)) / 86400000);
    if (seit > med * 1.5 + 45) return;
    const betraege = liste.slice(-6).map(t => Math.abs(t.betrag));
    const schnitt = betraege.reduce((s, b) => s + b, 0) / betraege.length;
    out.push({
      titel: letzte.titel, kategorieId: letzte.kategorieId, konto: letzte.konto, typ: letzte.typ,
      n: liste.length, med, naechst: maxDat(addDays(letzte.datum, med), TODAY),
      schnitt: Math.round(schnitt * 100) / 100, letzteDatum: letzte.datum,
    });
  });
  return out.sort((a, b) => a.naechst.localeCompare(b.naechst));
}

function rhythmusWort(tage) {
  if (tage <= 9) return 'wöchentlich';
  if (tage <= 20) return 'alle zwei Wochen';
  if (tage <= 45) return 'monatlich';
  if (tage <= 100) return 'vierteljährlich';
  if (tage <= 200) return 'halbjährlich';
  return 'jährlich';
}

function renderMuster() {
  const alle = muster();
  const bald = alle.filter(m => m.naechst <= addDays(TODAY, 120)).slice(0, 10);
  $('musterSum').textContent = alle.length ? ' · ' + alle.length + (alle.length === 1 ? ' Posten' : ' Posten') : ' · keine';
  $('musterInfo').textContent = alle.length
    ? alle.length + ' laufende Posten ohne Dauerauftrag erkannt. Hier die nächsten ' + bald.length + '.'
    : 'Keine regelmässigen Posten gefunden, für die noch kein Dauerauftrag besteht. Erkannt wird ab drei gleichartigen Buchungen mit gleichmässigem Abstand.';
  $('musterListe').innerHTML = bald.map((m, i) => {
    const k = katById(m.kategorieId);
    const tage = Math.round((new Date(m.naechst) - new Date(TODAY)) / 86400000);
    const faellig = tage <= 14;
    return '<div class="listrow"><div class="l">' +
      '<div><b>' + esc(m.titel) + '</b></div>' +
      '<div class="small">' + rhythmusWort(m.med) + ' · ' + m.n + '× · ' + esc(k ? k.kategorie : 'ohne Kategorie') + '</div>' +
      '<div class="small ' + (faellig ? 'warnc' : '') + '">nächste etwa ' + fmtDatum(m.naechst) +
      (tage >= 0 ? ' · in ' + tage + ' Tagen' : ' · überfällig') + '</div>' +
      '<div class="btnrow" style="margin-top:6px"><button class="small-btn" data-ms="' + i + '">Als Dauerauftrag anlegen</button></div>' +
      '</div><div class="num"><div class="mid">' + fmtCHF(m.schnitt) + '</div>' +
      '<div class="small">Ø von ' + m.n + '</div></div></div>';
  }).join('') || '';

  qsa('[data-ms]').forEach(el => el.onclick = () => musterUebernehmen(bald[+el.dataset.ms]));
}

// Erkanntes Muster ins Dauerauftrags-Formular legen, gespeichert wird von Hand.
function musterUebernehmen(m) {
  resetSerieForm();
  setSerMode(m.typ);
  $('serTitel').value = m.titel;
  $('serBetrag').value = String(m.schnitt);
  if ($('serBetrag')._calcUpd) $('serBetrag')._calcUpd();
  $('serStart').value = m.naechst;
  $('serKonto').value = m.konto || $('serKonto').value;
  const k = katById(m.kategorieId);
  if (k) { $('serGruppe').value = k.gruppe; fillGK('ser', m.typ); $('serKategorie').value = k.id; }
  // Rhythmus aus dem Median
  if (m.med >= 300) { $('serN').value = 1; $('serEinheit').value = 'J'; }
  else if (m.med >= 150) { $('serN').value = 6; $('serEinheit').value = 'M'; }
  else if (m.med >= 75) { $('serN').value = 3; $('serEinheit').value = 'M'; }
  else if (m.med >= 20) { $('serN').value = 1; $('serEinheit').value = 'M'; }
  else { $('serN').value = Math.max(1, Math.round(m.med / 7)); $('serEinheit').value = 'W'; }
  $('serAuto').checked = false;
  formOeffnen('serTitel');
  showMsg('ok', 'Übernommen. Betrag und Rhythmus prüfen, dann speichern.');
}

$('planLohn').addEventListener('input', () => { clearTimeout(window._pt); window._pt = setTimeout(renderPlan, 300); });
