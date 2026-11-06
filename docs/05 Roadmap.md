# Roadmap (Stand 06.11.2026, nach Release 1.1.2)

Gebaut wird nur, was ein prüfbares «Fertig heisst» hat. Die Reihenfolge ist ein Vorschlag.

**Entschieden:** «Wiederk.» bleibt eigener Reiter (sechs Reiter). Ein Lohnwert genügt (ein Arbeitgeber). Das Handy ist der Normalfall. Sicherungen als Dateien im OneDrive-Ordner, falls machbar (G0). Muster für D: Budget mehrfach überschritten, Konsum über Einnahmen, wachsende Fixkosten. Gearbeitet wird im lokalen Ordner; Hosting ist aus (S).

---

## S — Persönliche Daten aus dem öffentlichen Netz

**Anlass.** `index.html` enthielt über `data.js` die Jahreshistorie 2019–2025 und Budgetzahlen und war über GitHub Pages öffentlich. Ein Repo privat zu stellen stoppt Pages nicht; Zugriffsschutz gibt es nur mit Enterprise Cloud.

- **S1 ✅** Pages aus, altes Repo archiviert (06.11.).
- **S2 ✅ 1.1.1** Historie nach `state.hist`, beim Laden sofort gesichert; Service Worker cacht keine 404.
- **S3 ✅ 1.1.2** `HIST_*` und `APP_MAP` gelöscht, Startwerte neutral und ohne Beträge, Institutionsnamen und persönliche Zielkategorien aus den Import-Vorschlägen und Platzhaltern entfernt. Geprüft per `t23-neue-person` und Textsuche über `build/index.html`.
- **S4 ✅** Privates Repo `finance-tracking` neu, Veröffentlichung nur von `build/`. Der offizielle Actions-Weg bleibt in `deployment_queued` hängen (Fehler bei GitHub), darum über den Zweig `gh-pages`; Einzelheiten in `04 Deployment.md`.
- **S5 ✅** Altes Repo gelöscht (06.11.), damit ist die Historie auch aus dem Verlauf weg.

## A — Fehler, klein

**A1 Rechner auf dem Handy nicht benutzbar.** `#txBetrag` ist `<input type="text" inputmode="decimal">`: Android zeigt Ziffernfeld mit Punkt und Minus, aber ohne `+ * / ( )`. `rechne()` funktioniert, die Zeichen sind nicht eintippbar. Betrifft auch `#serBetrag`, `#planLohn`. **Nicht** auf `inputmode="text"` wechseln. Vorschlag: schmale Knopfzeile über dem Feld (`+ − × ÷ ( ) ⌫`), fügt an der Cursorposition ein, Fokus bleibt im Feld, nur sichtbar bei Fokus. Stolperstein: Ein Tipp auf einen Knopf nimmt dem Feld sonst den Fokus und schliesst die Tastatur. Darum `mousedown`/`touchstart` mit `preventDefault()` abfangen und den Wert über `setRangeText()` einfügen, statt den Fokus neu zu setzen.

*Fertig heisst:* `30+10*2` ist auf dem Handy ohne Hardwaretastatur eintippbar, Ergebnis im Hinweis, Tastatur bleibt offen.

**A2 Bearbeiten bleibt unsichtbar.** `editKonto()` füllt ein Formular in einem zugeklappten `<details>` und scrollt nach oben. Einmal lösen für alle: `formOeffnen(elId, titel)` klappt das `details` auf, `scrollIntoView({block:'center'})`, Überschrift «Bearbeiten: \<Name\>», kurzes Aufleuchten; Abbrechen setzt zurück. Einsetzen in `editKonto`, `editTx`, `editSerie`, Topf, Ziel, Wert; prüfen, ob `#wertCard` und der Kategorien-Dialog dasselbe Problem haben. *Fertig heisst:* Jeder Bearbeiten-Knopf führt sichtbar zum gefüllten Formular, geprüft auf 360 px.

**A3 Wiederk.: Überträge aussagelos.** `renderAbos` addiert alle Überträge (`fixUeb`) ohne Richtung; Hin- und Rückbuchungen zwischen eigenen Konten heben sich auf oder verfälschen. Vorschlag: Überträge **pro Zielkonto netto** (Zufluss minus Abfluss pro Monat), Topf-Daueraufträge als Unterzeile; Fixlast bleibt nur Ausgaben. *Fertig heisst:* Dauerauftrag Lohnkonto → Sparkonto 1000 und Rückbuchung 300 zeigen «Sparkonto +700 netto», nicht 1300.

**A4 Speichern dauert, Doppelklicks erzeugen Doppelbuchungen.** Vom Nutzer am 06.11. gemeldet. Ein `saveData()` auf dem Handy macht der Reihe nach: die ganze Datei lesen und voll parsen (Konfliktprüfung), `JSON.stringify(state, null, 2)` (684 KB; kompakt 591 KB, also 16 % mehr als nötig), diese 684 KB **synchron** in localStorage schreiben, die Datei nach OneDrive schreiben, dann in `bestaetigeSchreiben()` bis zu dreimal zurücklesen mit 250 und 500 ms Pause und jedes Mal voll parsen. Danach `renderAll()` über alle sechs Bildschirme mit 2376 Buchungen. Währenddessen bleiben alle Knöpfe scharf.

Gefährlich ist das beim Verbuchen eines fälligen Dauerauftrags: `verbuchen()` legt die Buchung an und wartet dann auf `saveData()`; ein zweiter Tipp legt sie erneut an, weil die Handler die Liste `f` festhalten. Beim Erfassen-Formular ist die Lage milder, weil `resetForm()` vor dem Speichern läuft — ein zweiter Tipp bringt dort eine Fehlermeldung statt einer Dublette.

*Vorschlag, in dieser Reihenfolge:*
1. **Klicksperre** (klein, behebt die Dublette): ein Helfer `async function einmal(el, fn)` schaltet den Knopf aus, zeigt «Speichere …», führt aus, schaltet wieder ein. Einsetzen bei allen Knöpfen, die speichern — Verbuchen, Alle verbuchen, Überspringen, Buchung speichern, Löschen im Dialog, Serie, Topf, Ziel, Wert, Kategorie, Gruppe, Art.
2. **Kompaktes JSON**: `JSON.stringify(state)` ohne Einrückung. Die Datei ist nicht zum Lesen von Hand gedacht, `parseTolerant()` ist davon unabhängig. 16 % weniger schreiben und zurücklesen.
3. **Konfliktprüfung ohne Vollparse**: für `meta.rev` genügt ein `match(/"rev"\s*:\s*(\d+)/)` auf dem Text, statt 684 KB zu parsen. Dasselbe in `bestaetigeSchreiben()`.
4. **localStorage-Kopie entkoppeln**: nicht vor jedem Dateischreiben synchron 684 KB, sondern danach und nur, wenn das Schreiben scheitert oder beim Verlassen der Seite (`visibilitychange`).
5. **`renderAll()` eingrenzen**: nur den sichtbaren Bildschirm rendern, die übrigen beim Wechsel. Erst nach der Messung aus I2, weil hier Bildschirme veralten können.

*Fertig heisst:* Zweimal schnell auf «Verbuchen» tippen erzeugt genau **eine** Buchung (Playwright-Test mit künstlich verzögertem Handle), während des Speicherns ist sichtbar, dass etwas läuft, und die Zeit von Tippen bis Rückmeldung ist auf dem Handy gemessen und in `01 Architektur.md` festgehalten. Punkt 1 und 2 gehören zu 1.2.0, Punkt 3 bis 5 zu 1.2.1.

---

## G — Daten retten können. Vor allem Komfortablen

**G0 Ordnerfreigabe messen** (Sondierung). Die App hält ein Datei-Handle; Kopien daneben brauchen ein Verzeichnis-Handle (`showDirectoryPicker()`), und ob Android Chrome das auf OneDrive zulässt, ist nicht vorhersagbar. Knopf unter Mehr → Daten, unauffällig: Ordner abfragen, Inhalt listen, Testdatei anlegen, zurücklesen, löschen, Ergebnis im Klartext. *Fertig heisst:* Auf dem Handy beantwortet. Positiv → G1 als Datei-Rotation im selben Ordner; negativ → G1 als Sicherung in IndexedDB plus Knopf «Sicherung herunterladen».

**G1 Backup-Rotation.** Heute: eine Datei plus localStorage-Kopie. Vorschlag: beim ersten Schreiben eines Kalendertages Kopie, fünf Stände rollierend (`finanzdaten.bak-1…5.json`), Anzeige unter Mehr → Daten, «Stand zurückholen» sichert zuerst den aktuellen. Bauform nach G0. *Fertig heisst:* Nach fünf Tagen liegen fünf Stände vor, einer lässt sich zurückholen, Speichern wird um höchstens eine halbe Sekunde langsamer.

**G2 Rückgängig nach Löschen.** Gelöschte Buchung zehn Sekunden in einer Variablen halten, Toast «Rückgängig». Kein Feld im Datenmodell. *Fertig heisst:* Gleiche `id` zurück, `aggInvalidate()` gelaufen.

**G3 Beschädigte Datei.** Scheitert `parseTolerant()`, heute undefiniert: vermutlich leere App über voller Datei, nächstes Speichern macht es endgültig. *Fertig heisst:* Scheitert das Lesen, wird **nicht geschrieben**; Befundseite mit localStorage-Kopie als Angebot; weiter erst nach ausdrücklichem Klick.

---

## B — Kategorievorschlag aus dem Titel

Grösster Alltagsgewinn. Bausteine in `phase5.js`: `normTitel()`, `worte()`. (1) Exakter Treffer auf `normTitel` → vorbelegen. (2) Sonst Wortüberschneidung gegen Titel der letzten zwölf Monate, nach Häufigkeit gewichtet, Jüngeres stärker. (3) Ab zwei Treffern derselben Kategorie vorschlagen, sonst nichts. Darstellung: Chip unter dem Titelfeld, Tipp übernimmt. **Nie automatisch setzen.** Index wie `agg()`, kein Durchlauf pro Tastendruck. *Fertig heisst:* Gegen die echte Datei gemessen trifft der Vorschlag bei mindestens 70 % der letzten 100 Buchungen die gewählte Kategorie; sonst Regel ändern statt ausliefern. Messung als Playwright-Skript.

---

## C — Übersichtlichkeit

- **C1 Erfassen abgrenzen.** Betrag, Titel, Kategorie als zusammenhängende Fläche (`--surface`), Konto/Datum/Tags/Notiz/Aufteilen in ruhigere zweite Gruppe, Ausgabe/Einnahme/Übertrag-Wahl deutlicher. **Erst Entwurf zeigen**, nicht umbauen. `02 Designsystem.md` gilt.
- **C2 Fällige Daueraufträge auf «Erfassen».** Hinweis oben mit Anzahl und Direktverbuchen; Reiter bleiben wie sie sind. *Fertig heisst:* Anzahl sichtbar bei Fälligem, sonst nichts.
- **C3** Rückmeldung beim Bearbeiten: siehe A2.
- **C4** Über vierzig Kategorien flach: erst anschauen, ob es stört.

---

## D — Problematische Muster auf «Budget»

Drei Muster, mehr nicht: **D1** Budget mehrere Monate in Folge überschritten (`istKat` gegen `bM`), **D2** Konsum über Einnahmen im Monat (`ausSplit` gegen Einnahmen), **D3** Fixkosten wachsen (`budgetRolle('fix')` über zwölf Monate, Trend). Eine Karte, nur wenn etwas zutrifft, höchstens drei Hinweise, je ein Satz mit Zahlen und ein Knopf dorthin, wo man es ändert, einzeln abstellbar. Gefahr ist Gewöhnung: scharfe Schwellen, nie «du gibst viel aus». **Abnahme vor dem Bau:** Regeln rückwirkend über zwölf Monate rechnen, Schwellen daran festlegen; jede Regel feuert in höchstens drei von zwölf Monaten. D2 ist kritisch (Steuer, Grossanschaffung): nur `istKonsum()`-Ausgaben oder Zweimonatsschnitt; sonst fällt D2 ersatzlos weg.

---

## H — Lebenslage

**H1 WG-Saldo** (erst nach dem Einzug, mit echten Fällen). Kein Mehrbenutzerbetrieb, nur ein Saldo: Schalter «hälftig geteilt» teilt die Buchung, der andere Anteil geht ohne Kategorie auf ein Konto vom Typ «Forderung»; Rückzahlung bucht dagegen. Offen: Forderungskonto (sauber, Migration) oder Topf mit negativem Stand.

**H2 Jahresabschluss und Steuerblatt** (Januar). Seite «Jahr» unter Mehr: Vermögen per 31.12. je Konto, Einnahmen/Ausgaben, Vorjahresvergleich, Positionen für Basel-Stadt (Säule 3a, Krankenkassenprämien, Berufsauslagen, Spenden) über die bestehenden **Arten**, CSV/Druck. Keine Steuerberechnung.

**H3 Töpfe und Steuern ab 2027: Buchungsmuster, kein Code.** Regel: **Ein Franken wird genau einmal zur Ausgabe, beim Zahlen, nie auch beim Zurücklegen.** Sonst verdoppelt sich die Steuerausgabe in Analyse und Fixkostenanteil.

| Vorgang | Buchung |
|---|---|
| Monatlich zurücklegen | Dauerauftrag **Übertrag ohne Kategorie** Lohnkonto → Sparkonto mit `topfId` |
| Zahlung (Steuerrechnung, Arzt, Ferien, Lager, ÖV-Abo) | **Ausgabe** mit Kategorie und `topfId`, ab dem Sparkonto |
| Budget der Kategorie | **Jahresbudget**, nicht monatlich |

Töpfe: Steuern, Franchise/Selbstbehalt, Ferien, Trainingslager, ÖV-Abo (U-Abo noch zu kaufen; Halbtax 90), Notgroschen. Notgroschen hat kein Budget: wird er gebraucht, trägt die Buchung die Kategorie des Anlasses. Echter Vermögensaufbau (Depot, 3a) ist kein Topf: dort ist das Einzahlen die Ausgabe (Art mit Rolle «Rücklage»). Geprüft: `topfDelta()` leert den Topf bei einer Ausgabe vom Topfkonto mit `topfId` korrekt.

---

## E — Zweite Person (Rest nach S)

Technisch braucht eine zweite Person nichts Neues: dieselbe Adresse, «Neue Datei erstellen». Mit S3 ist der Hauptblocker weg: der Code bringt keine fremden Zahlen mehr mit. Offen bleibt die Erstabfrage «Eigene Kategorien anlegen» oder «Vorlage übernehmen» mit neutraler Vorlage. Verworfen: Anmeldung, Mehrbenutzerbetrieb, Rechteverwaltung.

## F — Kündigungsfristen

Einziger Finanzguru-Punkt ohne Bankanbindung, der hier fehlt: pro Dauerauftrag «kündbar bis» und «Mindestlaufzeit» (neues Feld in `state.serien`, Migration), Liste «in 60 Tagen kündbar». Mehr Finanzguru nur auf konkrete Nennung.

## I — Haltbarkeit

- **I1 Regressionsnetz.** `eff`, `agg`, `rollAt`, `ausSplit`, `istKonsum` sind ungeprüft, seit t9–t17 weg sind; B, D, H1 fassen sie an. `tests/fixture.json` mit rund dreissig **erfundenen** Buchungen, je Sonderfall eine (Rückerstattung mit/ohne Deckung, Gegenbuchung, Übertrag mit/ohne Kategorie, Topf, Budgetwechsel, Jahresgrenze, Zukunft) und `tests/t20-kern.js` mit erwarteten Summen. *Fertig heisst:* unter zwanzig Sekunden grün, Teil jedes Releases.
- **I2** Einmal messen und festhalten: Grösse `index.html`, Zeit bis bedienbar auf dem Handy, Buchungszahl. Überschreitung um mehr als ein Viertel begründen.
- **I3** Archivo als `woff2` mitliefern und in den SW-Cache.

---

## Reihenfolge

1. **Build 1.2.0 «Bedienung»: A1 + A2 + A3 + A4 (Punkt 1 und 2) + G2.** ← nächster Schritt
   Nur Oberfläche und Fehlklicks. Fasst die Lese- und Schreiblogik nicht an, darum ist eine Regression eindeutig zuzuordnen.
2. **Build 1.2.1 «Datei»: G0 + G3 + A4 (Punkt 3 bis 5) + I2-Messung.**
   Alles, was `persist.js` tief anfasst, in einem Zug. G1 folgt in der Bauform, die G0 ergibt.
3. **I1**, dann **G1**, **B**, **C1 + C2**, **D**.
4. **F**; **H1** nach dem Einzug; **H2** im Januar; Rest von **E**.
5. I3 nebenher. H3 richtet der Nutzer 2027 selbst ein.

## Offene Fragen

1. **C1:** Erst Entwurf ansehen (Standard) oder direkt bauen?
2. **H1:** Forderungskonto oder Topf? Nach dem Einzug, mit echten Fällen.
3. **Historie in der Datei:** `hist.aus` und `hist.ein` werden bei dieser Datei nie gelesen, weil alle sieben Jahre Buchungen haben. Nur `hist.verm` wirkt (Vermögensverlauf). Entfernen würde die Datei um rund 4 KB verkleinern und nichts Sichtbares kosten — aber es löscht Daten, also nur auf ausdrückliche Ansage.

## Abgeschlossen

- **1.0.0 (05.11.2026)** Erfassen mit Rechner und Belegaufteilung, Arten und Rollen, Töpfe, Budgets mit Versionierung und Übertrag, Konten und Anlagekonten, Daueraufträge, kategorie-reine Rückerstattungen, Gegenbuchungen, Analyse, Plan-Szenario, Mustererkennung, Sparziele, Datei-Sync mit Konflikterkennung, Import aus «Meine Finanzen».
- **1.0.1 (05.11.2026)** Android-Schreibprüfung, am 06.11. auf dem Handy bestätigt.
- **1.1.1 (06.11.2026)** Siehe S2 und `CHANGELOG.md`.
- **1.1.2 (06.11.2026)** Siehe S3 und `CHANGELOG.md`. Veröffentlicht am 06.11. über den Zweig `gh-pages` (S4), altes Repo gelöscht (S5).

## Verworfen

Kursabfragen, Mehrwährung, Mehrbenutzerbetrieb in einer Datei, Bankanbindung, Verschlüsselung der Datei, Wechsel- und Sparvorschläge, Umbau der Reiterleiste, Tastaturerfassung am PC, zweiter Arbeitgeber. Nicht erneut vorschlagen.
