# Architektur, Datenmodell, Rechenregeln (Stand 1.1.2)

## Ordner, Dateien und Build

Der lokale Ordner `development/` ist die einzige Quelle der Wahrheit. Das Projekt auf claude.ai enthält nur die Dokumente.

```
development/
├─ README.md, CHANGELOG.md, .gitignore
├─ docs/         00 Projektanweisung … 05 Roadmap (Spiegel der Projektdokumente)
├─ src/          Quellteile
├─ build/        erzeugt von src/build.sh: index.html, sw.js, manifest, icons = die App
├─ tests/        Node-/Playwright-Skripte
├─ sicherungen/  Kopien der Datendatei und die Jahreshistorie einzeln (nicht in Git)
├─ .github/      Pages-Workflow: baut aus src/ und veröffentlicht nur build/
└─ finanzdaten.json   Arbeitskopie der Daten (nicht in Git, nicht verschieben)
```

| Datei in `src/` | Inhalt | Grösse |
|---|---|---|
| `head.html` | `<head>`, CSS-Designsystem, gesamtes Markup aller sechs Bildschirme, Dialoge | 44 KB |
| `data.js` | Startwerte für eine neue Datei: Kategorien ohne Beträge, Konten. Keine Historie, keine persönlichen Namen (seit 1.1.2) | 2.5 KB |
| `persist.js` | `state`-Initialisierung, IndexedDB, File System Access API, Laden/Schreiben/Prüfen, Statusanzeige, Banner | 17 KB |
| `main.js` | Helfer, Migration, Rechner, Aggregation, Budgets, Konten, Serien, Analyse, Import, `renderAll` | 112 KB |
| `phase1.js` | Arten, Töpfe, Geldfluss | 23 KB |
| `phase34.js` | Planbuchungen, Ampel, Kontoverlauf, Konten-Bildschirm, Ziele | 15 KB |
| `phase5.js` | Plan-Szenario, Mustererkennung | 9 KB |
| `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | PWA-Beiwerk, wird unverändert nach `build/` kopiert | |
| `build.sh` | setzt zusammen und prüft | |

`main.js` enthält drei Platzhalter, die `build.sh` ersetzt: `/*__PHASE1__*/`, `/*__PHASE34__*/`, `/*__PHASE5__*/`. Die Platzhalter stehen **vor** der ersten Verwendung der Funktionen; wer sie verschiebt, bricht die Initialisierung.

Verkettung: `head.html` + `data.js` + `persist.js` + `main.js` (mit eingesetzten Phasen) → `build/index.html`. Jeder Teil ab `data.js` ist ein eigenes `<script>`-Paar; alle Variablen liegen global.

`bash src/build.sh` prüft: alle Platzhalter vorhanden, jede per `$('x')` oder `getElementById('x')` angesprochene ID existiert im Markup (Ausnahme `toastMsg`, zur Laufzeit erzeugt), `node --check` über das gesamte JS, `APP_VERSION` und `VERSION` in `sw.js` passen zusammen. Bricht bei Fehlern ab. Zwischendateien liegen in `/tmp`, im Projekt wird nichts gelöscht.

## state

Ein einziges globales Objekt, als JSON gespeichert.

```
state = {
  kategorien: [{
    id, gruppe, kategorie, typ: 'Ausgabe'|'Einnahme', art,
    bh: [{ab: YYYYMM, budget, rhythmus: 'M'|'J', rollover: 0..100}]   // Budgetversionen, aufsteigend
  }],
  gruppen: [{name, typ, farbe}],
  arten: [{id, typ, name, rolle: 'fix'|'variabel'|'ruecklage', konsum: bool, fest: bool}],
  konten: [{id, name, typ: 'bank'|'anlage', startsaldo, startdatum,
            staende: [{id, datum, wert}]}],                            // nur bei typ 'anlage'
  toepfe: [{id, name, kontoId, start, ziel}],
  transaktionen: [{
    id, datum: 'YYYY-MM-DD', typ: 'Ausgabe'|'Einnahme'|'Übertrag',
    betrag, titel, notiz, kategorieId, konto, kontoNach, tags: [],
    topfId, serieId, serieTermin, splitId, gegen: bool
  }],
  serien: [{id, titel, betrag, typ, kategorieId, konto, kontoNach, start,
            n, einheit: 'W'|'M'|'J', auto: bool, aktiv: bool,
            skip: ['YYYY-MM-DD'], anpass: {...}, gegen: bool, topfId}],
  hist: {aus: {jahr: {kategorieName: betrag}}, ein: {…}, verm: {jahr: {datum, spar, lohn, anl, son, kry}}},   // Jahreshistorie 2019–2025, nur lesbar, seit 1.1.1 in der Datei
  ziele: [{id, name, kontoId, betrag, bis}],      // kontoId kann 'tp:<topfId>' sein
  vorlagen: [...],
  einst: {lohn, ...},
  vermoegen: [...],                                // Altlast aus dem Import
  meta: {rev, geraet, letzteAenderung}
}
```

`meta.rev` steigt bei jedem Speichern um eins. `geraet` ist eine zufällige Kennung pro Browser, in localStorage. Daraus entsteht die Konflikterkennung.

`migrate()` in `main.js` legt fehlende Felder an und wird bei jedem Laden ausgeführt. **Jedes neue Feld gehört dort hinein.**

## Rechenregeln, die man nicht errät

**Vorzeichen.** `eff(t)` liefert für jede Buchung `{typ, k, vz}`. Ein `Übertrag` zählt nur, wenn er eine Kategorie hat; dann gilt der Typ der Kategorie. Ist `gegen: true` gesetzt, wird `vz = -1`: die Buchung zieht von ihrer Kategorie ab. Damit sind 100 auf das Depot und 80 vom Sparkonto zurück netto 20 gespart, während die Kontostände beide echten Richtungen behalten.

**Negative Beträge sind Rückerstattungen.** Sie senken nur die Ausgaben **ihrer eigenen** Kategorie. Bleibt nach der Verrechnung in einer Kategorie Geld übrig (Erstattung ohne passende Ausgabe im Zeitraum), wird dieser Rest in `ausSplit()` separat als `ueber` ausgewiesen, statt stillschweigend fremde Kategorien zu verbilligen. Das war ein echter Fehler und ist mit Bedacht so gelöst.

**Ist ist Vergangenheit.** `agg()` baut einen Index `typ|jahr|monat|kategorieId → Betrag` und überspringt alles mit `datum > TODAY`. Zukünftige Buchungen fliessen ausschliesslich über `planSplit()` und `geplanteSerien()` ein und erscheinen nie im Ist. Nach jeder Änderung an `state.transaktionen` muss `aggInvalidate()` laufen, zusätzlich `ROLLC = null`, wenn Budgets betroffen sind. Jahre vor 2026 **ohne** Buchungen kommen aus `state.hist` (`jahrTotal`, `istKat`); hat ein Jahr Buchungen, gewinnt `hatLive()` und die Historie wird nicht gelesen. Beim Autor haben alle Historienjahre Buchungen (Import), dort wirkt nur `hist.verm` im Vermögensverlauf.

**Konsum.** `istKonsum(k)` entscheidet, ob eine Ausgabe im Konsum mitzählt. Sparen, Vorsorge und Steuerrückstellungen sind Ausgaben, aber kein Konsum. Die Art der Kategorie bestimmt das, nicht die Kategorie selbst.

**Budgetversionen.** `bh` ist eine aufsteigende Liste `{ab, budget, rhythmus, rollover}`. `bM(k, j, m)` liefert das Budget des Monats, `bVer` die passende Version. Frühere Monate bleiben unverändert, wenn ich heute ein Budget ändere. Ein Monat ohne Version gilt als «ohne Budget» und überträgt nichts.

**Übertrag.** `rollAt(k, j, m)` rechnet den Übertrag über Jahresgrenzen, beginnend beim ersten Budgetmonat. Monate ohne Budget übertragen nichts, sonst würde etwa eine Kaution ohne Budget für immer als Überzug mitlaufen. Ergebnis wird in `ROLLC` gecacht.

**Töpfe** reservieren Geld innerhalb eines Kontos, ohne eigenes Bankkonto. `topfStand(topf, bis)` summiert Buchungen mit passender `topfId`, `reserviert(konto)` die Summe aller Töpfe des Kontos, `freiVerfuegbar()` ist liquide minus reserviert.

**Anlagekonten** haben keinen Saldo aus Buchungen, sondern Wertstände von Hand (`staende`). `kontoGV()` rechnet Gewinn und Verlust als Wert minus Einstand.

## Funktionsindex

Nur die, die man sucht. Alle global.

**Helfer** `$`, `qsa`, `esc`, `fmtCHF`, `fmt0`, `fmtDatum`, `isoVon`, `addDays`, `addMonths`, `monatsEnde`, `rechne` (sicherer Ausdrucksparser für das Betragsfeld, kein eval), `calcHint`.

**Aggregation und Budget** `eff`, `agg`, `aggInvalidate`, `liveSum`, `ausSplit`, `rollAt`, `budgetMonat`, `budgetJahr`, `istKat`, `jahrTotal`, `bM`, `bJ`, `bVer`, `budgetAktiv`.

**Arten und Töpfe** (`phase1.js`) `arten`, `artenFuer`, `artVon`, `kArt`, `rolleVon`, `istKonsum`, `istRuecklage`, `artVorschlag`, `artSplit`, `budgetArt`, `budgetRolle`, `toepfe`, `topfStand`, `reserviert`, `freiVerfuegbar`, `renderFluss`, `renderToepfe`, `renderArten`.

**Konten und Ziele** (`phase34.js`) `planSplit`, `ampel`, `kontoWert`, `kontoEinstand`, `kontoGV`, `kontoPrognose`, `kontoVerlauf`, `svgVerlauf`, `renderKonten`, `kontoDetail`, `renderZiele`, `zielStand`, `vermoegenHeute`, `vermoegenPrognose`.

**Serien** `serieTermin`, `serieTermine`, `naechsterTermin`, `faellige`, `buchungAusSerie`, `verbuchen`, `autoVerbuchen`, `geplanteSerien`, `serieAnpassen`, `renderAbos`.

**Plan und Muster** (`phase5.js`) `planLohn`, `planRechnung`, `renderPlan`, `muster`, `schonAbgedeckt`, `rhythmusWort`, `renderMuster`, `musterUebernehmen`.

**Erfassen** `setMode`, `resetForm`, `splitZeilen`, `splitRest`, `splitSumme`, `txZeile`, `renderRecentTx`, `openTx`, `editTx`, `vorlageAnwenden`.

**Analyse** `renderAnalyse`, `anaZeitraum`, `monatsReihe`, `svgDonut`, `hBars`, `svgMonate`, `svgReihe`, `renderKatVerlauf`.

**Import** `parseCSV`, `parseDatum`, `mfStart`, `mfRender`, `mfImport`, `APP_MAP` in `data.js`.

**Persistenz** `loadData`, `saveData`, `schreibeDatei`, `bestaetigeSchreiben`, `parseTolerant`, `ensurePerm`, `idbGet`, `idbSet`, `updateFileStatus`, `updateBanner`, `tryAutoConnect`, `showMsg`, `diag`.

**Oberfläche** `showScreen`, `renderAll` (ruft alle Render-Funktionen), `neueVersion`, `renderMehr`, `mehrPane`.

Bildschirme: `#screen-erfassen`, `#screen-budget`, `#screen-konten`, `#screen-abos`, `#screen-analyse`, `#screen-mehr`.

## Persistenz und Konflikte

Datei über die File System Access API, Handle in IndexedDB (`finanzapp_db`, Store `h`). Jeder IndexedDB-Zugriff hat ein hartes Timeout, weil `indexedDB.open()` unter `file://` in Chrome weder `success` noch `error` liefert und den Start blockieren würde. Sicherungskopie in localStorage unter `finanzapp_data`.

`saveData()` liest vor dem Schreiben die Datei und vergleicht `meta.rev` mit `bekannteRev`. Ist die Datei neuer, kommt ein `confirm`: schreiben und fremde Änderungen verwerfen, oder abbrechen und neu laden. Danach wird geschrieben und das Ergebnis geprüft.

`loadData()` ruft `migrate()` auf, **speichert aber nicht von selbst**. Legt `migrate()` etwas an, das nur aus dem Code stammen kann, setzt es `MIGRATION_SPEICHERN`, und `loadData()` speichert sofort. Sonst käme es erst bei der nächsten Buchung in die Datei. Jede Migration, die Daten aus dem Code in die Datei überführt, folgt diesem Muster, **bevor** die Quelle im Code gelöscht wird (so lief 1.1.1 → 1.1.2 mit der Historie). Der Merker ist derzeit ungenutzt und steht für die nächste solche Migration bereit.

## Android-Fallen

Diese vier haben je einen halben Tag gekostet. Nicht erneut hineinlaufen.

1. **Kein Abschneiden beim Überschreiben.** Android Chrome lässt beim Schreiben einer kürzeren Datei den alten Rest stehen. `schreibeDatei()` macht deshalb `truncate(0)` → `write` → `truncate(bytes)`, jedes in `try/catch`, weil mal das eine, mal das andere ignoriert wird. Gelesen wird mit `parseTolerant()`, das das erste vollständige JSON-Objekt nimmt und den Rest verwirft.
2. **Träger Lesezugriff.** `getFile()` direkt nach dem Schreiben liefert oft noch den alten Stand. Ein Vergleich der Zeichenzahl erzeugt dadurch Fehlalarme («Datei hat 764545 statt 764792 Zeichen»). `bestaetigeSchreiben()` vergleicht stattdessen `meta.rev` und liest bis zu dreimal mit 250 und 500 ms Pause. Bleibt es unbestätigt, gilt das als Erfolg mit stillem Vermerk, **nicht** als Fehler. Nur eine fremde, höhere `rev` ist ein echter Konflikt.
3. **Freigabe verfällt.** Android verwirft die Dateifreigabe bei jedem App-Neustart. Nicht lösbar, Entscheidung des Browsers. Milderung: Banner `#connBanner` direkt unter dem Kopf mit einem Knopf «Verbinden», der `#btnReconnect` auslöst. Sichtbar, wenn `pendingHandle` gesetzt ist oder `writeState === 'fail'`.
4. **Service Worker.** Version nicht erhöht heisst alte App, und der Fehler sieht aus wie ein Codefehler. `sw.js` holt alles mit `cache: 'no-store'` und fällt nur offline auf den Cache zurück. Fehlerantworten (404) werden seit 1.1.1 weder gecacht noch ausgeliefert, solange eine gute Fassung im Cache liegt.

**Bestätigt** am 06.11.2026 auf einem echten Android-Gerät: 1.0.1 schreibt ohne Fehlermeldung.

## Tests

Node-Skripte mit Playwright, keine Test-Bibliothek. Muster: Browser starten, `state` per `addInitScript` in localStorage legen, `page.evaluate` rechnet gegen die echten Funktionen, einfache `chk(name, bedingung, info)`-Zeilen, Exitcode 1 bei Fehlschlag. `page.on('pageerror')` sammelt JS-Fehler; die zählen immer als Fehlschlag.

Playwright gibt es nur im Cloud-Container, nicht auf dem Rechner. Ablauf: `build/index.html` (dazu `build/sw.js`, `finanzdaten.json`) per `device_stage_files` holen, dort laufen lassen. Die echte Datei wird nur gelesen.

| Test | Prüft | Aufruf |
|---|---|---|
| `t18-schreibpruefung.js` | Schreibprüfung über `meta.rev`, Abschneiden, Banner (simulierte Handles) | `node t18… <index.html>` |
| `t21-historie.js` | Buchungsjahre unabhängig von der Historie, Jahre ohne Buchungen aus ihr, Vermögensverlauf, leere Fächer ohne Historie | `node t21… <index.html> <finanzdaten.json>` |
| `t22-sw-fehlerseite.js` | Service Worker legt keine 404 über die gute Fassung | `node t22… <sw.js>` |
| `t23-neue-person.js` | Erststart ohne Datei: Startkategorien ohne Budget, keine persönlichen Namen, alle sechs Bildschirme | `node t23… <index.html>` |

Erwartungswerte gehören nie in den Test, sondern werden aus der Datei gerechnet (Regel 8). Die Reihe t9–t17 ist verloren (sie lief gegen die private Datei); Ersatz ist Roadmap I1. Kurzfassung in `tests/LIESMICH.md`. Layout geprüft auf 360, 390, 430 und 820 px Breite.

## Konventionen

Deutsche Namen. Kein `eval`, kein `innerHTML` mit Nutzertext ohne `esc()`. Beträge als Zahl, Rundung erst in der Anzeige (`fmtCHF`). Datum immer `YYYY-MM-DD` als String, Vergleiche lexikografisch. `TODAY` ist global und wird beim Start gesetzt. Kommentare erklären das Warum, nicht das Was.
