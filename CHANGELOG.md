# Changelog

Neueste oben. Pro Eintrag: Anlass, Änderungen, Tests, was der Nutzer tun muss.

## 1.2.0 · 06.11.2026 «Bedienung»

**Anlass.** Fünf Punkte, die im Alltag stören: der Rechner im Betragsfeld war auf dem Handy
nicht erreichbar, Bearbeiten-Knöpfe füllten unsichtbare Formulare, die Übertragssumme in
«Wiederk.» war aussagelos, langsames Speichern erzeugte Doppelbuchungen, und Löschen war
endgültig. Nur Oberfläche und Fehlklicks; die Lese- und Schreiblogik bleibt unberührt.

- **A1 Rechnerzeile.** `rechnerZeile()` legt unter `#txBetrag`, `#serBetrag` und `#planLohn`
  eine Knopfzeile `+ − × ÷ ( ) ⌫`, sichtbar nur bei Fokus. Eingefügt wird per `setRangeText()`
  an der Cursorposition; `mousedown`/`touchstart` werden abgefangen, damit die Tastatur offen
  bleibt. `inputmode="decimal"` bleibt wie es war.
- **A2 `formOeffnen(elId, titel)`.** Klappt das `details` auf, scrollt mittig hin, setzt die
  Überschrift (`.formtitel`) auf «Bearbeiten: …» und lässt die Karte kurz aufleuchten.
  Eingesetzt bei Konto, Dauerauftrag, Topf, Ziel, Buchung und beim Übernehmen eines Musters;
  `formSchliessen()` setzt die Überschrift beim Abbrechen zurück. Geprüft: Kategorie, Gruppe
  und Art liegen in Dialogen, haben das Problem also nicht; der Wert eines Anlagekontos hat
  keinen Bearbeiten-Knopf.
- **A3 Überträge netto.** `ueberNetto()` rechnet je Konto Zufluss minus Abfluss pro Monat,
  `renderUeberNetto()` zeigt eine Zeile je Konto und Topf-Daueraufträge als Unterzeile.
  Die alte Bruttosumme `#fixUeb` ist weg. Keine Farbe: ein Übertrag ist weder Einnahme noch
  Ausgabe, das Vorzeichen genügt.
- **A4 Punkt 1 und 2.** `einmal(el, fn)` schaltet den Knopf aus, zeigt «Speichere …» und
  sperrt über `SPEICHERT` auch alle anderen; `sperre(id)` hängt das nachträglich um die
  feststehenden Knöpfe, die pro Render neu gesetzten (Verbuchen, Alle verbuchen,
  Überspringen, Löschen im Dialog) sind an ihrer Stelle umhüllt. `saveData()` schreibt
  kompaktes JSON: 684 KB → 540 KB, entsprechend weniger zu schreiben und zurückzulesen.
- **G2 Rückgängig.** `undoToast()` hält die gelöschte Buchung zehn Sekunden in einer
  Variablen; ein Tipp legt sie mit derselben `id` zurück. Kein neues Feld im Datenmodell,
  darum auch keine Migration. `showMsg()` löscht den Kasten nur noch, wenn seither nichts
  Neues darin steht.

**Tests.** Playwright gibt es weder auf dem Rechner noch in der Shell daneben, und
`device_stage_files` stand in diesem Chat nicht zur Verfügung — die echte Datei konnte also
nicht in den Cloud-Container. Ersatz: `tests/pw-jsdom.js`, ein Playwright-Ersatz auf jsdom,
der genau die benutzten Aufrufe abdeckt (`node -r ./tests/pw-jsdom.js tests/<test>.js …`).
Damit laufen t18, t21, t22, t23 unverändert und grün. Neu `t24-bedienung.js`: Rechnerzeile,
formOeffnen, Nettoüberträge, drei schnelle Tipps auf «Verbuchen» → genau eine Buchung,
kompaktes JSON, Rückgängig. jsdom liegt ausserhalb des Projektordners, im Repo bleibt nichts
Fremdes liegen.

**Was du tun musst.**
1. Veröffentlichen: `git add -A && git commit && git push` (siehe `docs/04 Deployment.md`).
2. Am Handy unter Mehr → Daten prüfen, dass dort 1.2.0 steht.
3. Am Handy antesten: Rechnerzeile im Betragsfeld, zweimal schnell auf «Verbuchen»,
   eine Buchung löschen und zurückholen, «Wiederk.» mit den Netto-Zeilen.
4. Nächster Build ist 1.2.1 «Datei»: G0 + G3 + A4 Punkt 3 bis 5 + I2-Messung.

## 1.1.2 · 06.11.2026

**Anlass.** Nach 1.1.1 liegt die Historie in der Datei. Jetzt verlässt sie den Code, zusammen mit allem anderen Persönlichen — die App soll auch für andere brauchbar sein.

- `data.js` von 9.5 auf 2.5 KB: `HIST_AUS/EIN/VERM` gelöscht, `APP_MAP` samt `EXCL` gelöscht (war toter Code, nie benutzt).
- `DEFAULT_KATEGORIEN` neutral: 37 Kategorien ohne Beträge (alle Budgets 0), ohne persönliche Namen. Gilt nur für eine Datei ohne eigene Kategorien, bestehende Dateien sind nicht betroffen.
- `DEFAULT_KONTEN` ohne Anbieternamen. Import-Vorschläge (`MF_VORSCHLAG`) ohne Institutionen und ohne persönliche Zielkategorien: nicht Zugeordnetes fragt der Assistent jetzt ab, statt ein Konto zu erfinden. Platzhalter in `head.html` neutral.
- `migrate()` legt `state.hist` mit leeren Fächern an, wenn eine Datei keine Historie hat; `vermoegenAnzeige()` nimmt das jüngste vorhandene Historienjahr statt eines festen und verträgt eine leere Historie.
- `HIST_NEU` heisst jetzt `MIGRATION_SPEICHERN` und bleibt als Mechanismus für künftige Migrationen (Regel 9).
- Pages-Workflow (`.github/workflows/pages.yml`), `.gitignore`, erster Commit. Der Workflow bricht ab, falls eine Datendatei im Repo liegt.
- Tests: `t21-historie` neu geschrieben, `t23-neue-person` neu, `t18`/`t22` unverändert grün. `build/index.html` per Textsuche ohne persönliche Spuren.

**Befund.** Alle sieben Historienjahre haben auch echte Buchungen, weil der Import sie mitgebracht hat. `hatLive()` gewinnt, also wird `hist.aus`/`hist.ein` bei dieser Datei nie gelesen — sichtbar ist nur `hist.verm` im Vermögensverlauf. Die Historie war für die Jahresansicht also schon vorher ohne Wirkung.

**Veröffentlichung.** Neues privates Repo `finance-tracking`, altes gelöscht. Der offizielle Pages-Weg über `deploy-pages` bleibt in `deployment_queued` hängen (Fehler bei GitHub, Build und Upload gelingen), auch nach Aus- und Wiedereinschalten von Pages. Veröffentlicht wird darum über den Zweig `gh-pages`: `pages-zweig.yml` baut bei jedem Push und legt `build/` dort ab, GitHub veröffentlicht den Zweig. `pages.yml` ist geparkt und läuft nur von Hand. `build.sh` legt `.nojekyll` in `build/`.

## 1.1.1 · 06.11.2026

**Anlass.** Die Jahreshistorie 2019–2025 und Budgetzahlen standen in `data.js` und damit in der öffentlich ausgelieferten `index.html`. Sie müssen aus dem Code in die Datei.

- `migrate()` legt `state.hist` aus den Code-Konstanten an (`HIST_AUS/EIN/VERM`); `jahrTotal`, `istKat`, `vermoegenAnzeige`, `renderVermoegen` lesen daraus. (1.1.0)
- `loadData()` speichert frisch angelegte Historie sofort (`HIST_NEU`). Vorher wäre sie bis zur nächsten Buchung nur im Arbeitsspeicher gewesen.
- Service Worker cacht und liefert keine Fehlerseiten (404) mehr, solange eine gute Fassung im Cache liegt.
- `build.sh`: schreibt nach `build/`, prüft die Versionsnummern gegeneinander, nutzt `/tmp` für Zwischendateien, löscht im Projekt nichts.
- Ordner umgebaut: `docs/`, `build/` (erzeugt), `sicherungen/`, `README.md`, `.gitignore`; Icons nach `src/`.
- Tests: neu `t21-hist-sichern`, `t22-sw-fehlerseite`; `t18` läuft auf neuem Pfad. Alle grün. Jahressummen 2019–2025 und Vermögen 2025 stimmen mit den Code-Konstanten überein.

Erledigt und auf dem Gerät bestätigt; die Arbeitskopie im Ordner enthält `hist` mit sieben Jahren (`rev 16`).

## 1.0.1 · 05.11.2026

Android-Schreibprüfung über `meta.rev` statt Zeichenzahl, dreistufiges Abschneiden, Banner zum Wiederverbinden. Am 06.11.2026 auf dem Handy bestätigt.

## 1.0.0 · 05.11.2026

Siehe `docs/03 Funktionsumfang.md`.
