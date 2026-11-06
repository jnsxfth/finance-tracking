# Roadmap (Stand 06.11.2026, nach Release 1.2.0)

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

- **A1 ✅ 1.2.0** Rechnerzeile `+ − × ÷ ( ) ⌫` über den Betragsfeldern, nur bei Fokus.
- **A2 ✅ 1.2.0** `formOeffnen()` für Konto, Dauerauftrag, Topf, Ziel, Buchung, Muster.
- **A3 ✅ 1.2.0** Überträge netto pro Konto, Töpfe als Unterzeile.
- **A4 Punkt 1 und 2 ✅ 1.2.0** Klicksperre (`einmal`) und kompaktes JSON (684 → 540 KB).

**A4 Punkt 3 bis 5, offen (1.2.1).** Alles, was `persist.js` tief anfasst:
3. **Konfliktprüfung ohne Vollparse**: für `meta.rev` genügt ein `match(/"rev"\s*:\s*(\d+)/)` auf dem Text, statt die ganze Datei zu parsen. Dasselbe in `bestaetigeSchreiben()`.
4. **localStorage-Kopie entkoppeln**: nicht vor jedem Dateischreiben synchron die ganze Datei, sondern danach und nur, wenn das Schreiben scheitert oder beim Verlassen der Seite (`visibilitychange`).
5. **`renderAll()` eingrenzen**: nur den sichtbaren Bildschirm rendern, die übrigen beim Wechsel. Erst nach der Messung aus I2, weil hier Bildschirme veralten können.

*Fertig heisst:* Zeit von Tippen bis Rückmeldung auf dem Handy gemessen und in `01 Architektur.md` festgehalten. Die Dublette ist mit 1.2.0 erledigt (t24).

---

## G — Daten retten können. Vor allem Komfortablen

**G0 Ordnerfreigabe messen** (Sondierung). Die App hält ein Datei-Handle; Kopien daneben brauchen ein Verzeichnis-Handle (`showDirectoryPicker()`), und ob Android Chrome das auf OneDrive zulässt, ist nicht vorhersagbar. Knopf unter Mehr → Daten, unauffällig: Ordner abfragen, Inhalt listen, Testdatei anlegen, zurücklesen, löschen, Ergebnis im Klartext. *Fertig heisst:* Auf dem Handy beantwortet. Positiv → G1 als Datei-Rotation im selben Ordner; negativ → G1 als Sicherung in IndexedDB plus Knopf «Sicherung herunterladen».

**G1 Backup-Rotation.** Heute: eine Datei plus localStorage-Kopie. Vorschlag: beim ersten Schreiben eines Kalendertages Kopie, fünf Stände rollierend (`finanzdaten.bak-1…5.json`), Anzeige unter Mehr → Daten, «Stand zurückholen» sichert zuerst den aktuellen. Bauform nach G0. *Fertig heisst:* Nach fünf Tagen liegen fünf Stände vor, einer lässt sich zurückholen, Speichern wird um höchstens eine halbe Sekunde langsamer.

**G2 ✅ 1.2.0** Rückgängig nach Löschen: gelöschte Buchung zehn Sekunden in einer Variablen, Toast «Rückgängig», gleiche `id` zurück (t24).

**G3 Beschädigte Datei.** Scheitert `parseTolerant()`, heute undefiniert: vermutlich leere App über voller Datei, nächstes Speichern macht es endgültig. *Fertig heisst:* Scheitert das Lesen, wird **nicht geschrieben**; Befundseite mit localStorage-Kopie als Angebot; weiter erst nach ausdrücklichem Klick.

---

## B — Kategorievorschlag aus dem Titel

Grösster Alltagsgewinn. Bausteine in `phase5.js`: `normTitel()`, `worte()`. (1) Exakter Treffer auf `normTitel` → vorbelegen. (2) Sonst Wortüberschneidung gegen Titel der letzten zwölf Monate, nach Häufigkeit gewichtet, Jüngeres stärker. (3) Ab zwei Treffern derselben Kategorie vorschlagen, sonst nichts. Darstellung: Chip unter dem Titelfeld, Tipp übernimmt. **Nie automatisch setzen.** Index wie `agg()`, kein Durchlauf pro Tastendruck. *Fertig heisst:* Gegen die echte Datei gemessen trifft der Vorschlag bei mindestens 70 % der letzten 100 Buchungen die gewählte Kategorie; sonst Regel ändern statt ausliefern. Messung als Playwright-Skript.

---

## C — Übersichtlichkeit

- **C1 Erfassen abgrenzen.** Betrag, Titel, Kategorie als zusammenhängende Fläche (`--surface`), Konto/Datum/Tags/Notiz/Aufteilen in ruhigere zweite Gruppe, Ausgabe/Einnahme/Übertrag-Wahl deutlicher. **Erst Entwurf zeigen**, nicht umbauen. `02 Designsystem.md` gilt.
- **C2 Fällige Daueraufträge auf «Erfassen».** Hinweis oben mit Anzahl und Direktverbuchen; Reiter bleiben wie sie sind. *Fertig heisst:* Anzahl sichtbar bei Fälligem, sonst nichts.
- **C3 ✅ 1.2.0** Rückmeldung beim Bearbeiten, erledigt mit A2.
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

- **I1 Regressionsnetz.** `eff`, `agg`, `rollAt`, `ausSplit`, `istKonsum` sind ungeprüft, seit t9–t17 weg sind (der jsdom-Ersatz aus 1.2.0 macht sie ohne Playwright prüfbar); B, D, H1 fassen sie an. `tests/fixture.json` mit rund dreissig **erfundenen** Buchungen, je Sonderfall eine (Rückerstattung mit/ohne Deckung, Gegenbuchung, Übertrag mit/ohne Kategorie, Topf, Budgetwechsel, Jahresgrenze, Zukunft) und `tests/t20-kern.js` mit erwarteten Summen. *Fertig heisst:* unter zwanzig Sekunden grün, Teil jedes Releases.
- **I2** Einmal messen und festhalten: Grösse `index.html`, Zeit bis bedienbar auf dem Handy, Buchungszahl. Überschreitung um mehr als ein Viertel begründen.
- **I3** Archivo als `woff2` mitliefern und in den SW-Cache.

---

## Reihenfolge

1. **Build 1.2.0 «Bedienung» ✅** A1 + A2 + A3 + A4 (Punkt 1 und 2) + G2.
2. **Build 1.2.1 «Datei»: G0 + G3 + A4 (Punkt 3 bis 5) + I2-Messung.** ← nächster Schritt
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
- **1.2.0 (06.11.2026)** A1, A2, A3, A4 (1+2), G2, dazu C3. Siehe `CHANGELOG.md`.

## Verworfen

Kursabfragen, Mehrwährung, Mehrbenutzerbetrieb in einer Datei, Bankanbindung, Verschlüsselung der Datei, Wechsel- und Sparvorschläge, Umbau der Reiterleiste, Tastaturerfassung am PC, zweiter Arbeitgeber. Nicht erneut vorschlagen.
