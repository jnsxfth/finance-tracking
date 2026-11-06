# Changelog

Neueste oben. Pro Eintrag: Anlass, Änderungen, Tests, was der Nutzer tun muss.

## 1.2.2 · 06.11.2026 «Brutto»

**Anlass.** In 1.2.1 standen «Wiederkehrende Ausgaben» und «Einnahmen» verrechnet in der Klappe — also dieselbe Zahl wie der Blickfang. Gewollt ist brutto: nur, was in diese Richtung wirkt.

- **Brutto statt verrechnet.** `renderAbos` summiert fuer die beiden Zeilen jetzt nur die Serien, die in ihre Richtung zeigen (`typ==='Ausgabe' && betrag>0`, `typ==='Einnahme' && betrag>0`), und nimmt die Beträge absolut.
- **Gegenstücke als eigene Zeile**, nicht gegengerechnet: «wiederkehrende Rückerstattungen» unter den Ausgaben, «wiederkehrende Abzüge davon» unter den Einnahmen. Beide erscheinen nur, wenn es sie gibt (`#rowAusRueck`, `#rowEinAbzug`).
- **Der Blickfang bleibt die effektive Belastung**, also Ausgaben minus Rückerstattungen. Damit stehen oben und unten bewusst zwei verschiedene Zahlen, und der Erklärtext sagt welche.
- Farben nach Regel 6: Ausgaben und Abzüge neutral, Rückerstattungen und Einnahmen grün, weil Geld herein.

**Befund.** Deine Datei hat 9 aktive Ausgabe-Serien, davon **6 mit negativem Betrag**. Brutto und netto gehen darum um den Faktor 2,5 auseinander — die Unterscheidung ist bei dir sichtbar, nicht theoretisch. Zweitens: der Blickfang «Fixkosten pro Monat» liegt im zweistelligen Bereich, also sind deine echten Fixkosten (Miete, Krankenkasse, Abos) noch nicht als Daueraufträge angelegt. Solange das so ist, sagt die Kachel wenig — das ist Einrichtung, kein Codefehler.

**Tests.** `t24` um sechs Prüfungen erweitert (C7): Brutto-Summen, beide Unterzeilen, Blickfang bleibt netto, keine Unterzeilen ohne Gegenstücke. Gegenprobe gemacht: mit der verrechnenden Fassung schlägt der Block fehl (120 statt 150, 180 statt 200). t18, t21, t22, t23, t25 unverändert grün.

**Was du tun musst.**
1. Veröffentlichen: `git add -A && git commit -m "1.2.2" && git push`.
2. Am Handy Version 1.2.2 prüfen, dann «Wiederk.» aufklappen.
3. Nächster Build ist «Datei»: G0 + G3 + A4 Punkt 3 bis 5 + I2-Messung.

## 1.2.1 · 06.11.2026 «Nachtrag»

**Anlass.** Die Rechnerzeile aus 1.2.0 war am Handy unbenutzbar: die Knöpfe waren da, reagierten aber nicht. Dazu zwei Wünsche zur Übersicht auf «Wiederk.».

- **Fehler in A1 behoben.** Die Zeile hielt den Fokus über `preventDefault()` auf `touchstart` — und damit unterdrückt der Browser den darauffolgenden `click` vollständig. Der Knopf tat am Finger gar nichts, mit der Maus schon. Die Aktion liegt jetzt in `pointerdown` (Maus, Finger, Stift in einem Ereignis, feuert vor dem Fokuswechsel), `click` ist weg. Fallback auf `touchstart`/`mousedown` nur für Browser ohne `PointerEvent`.
- **Fixkosten-Kachel aufgeräumt.** Der Blickfang (Fixkosten pro Monat und Jahr) bleibt oben; wiederkehrende Ausgaben, wiederkehrende Einnahmen und die Nettoüberträge je Konto liegen in der Klappe «Wiederkehrend im Detail», deren Kopfzeile das Wichtigste zeigt, ohne dass man sie öffnet.
- **«Erkannte Muster» ist eine Klappe** mit der Anzahl in der Kopfzeile.

**Befund, den du kennen musst.** «Wiederkehrende Ausgaben» war hier noch dieselbe verrechnete Zahl wie «Fixkosten pro Monat» — in 1.2.2 auf brutto umgestellt. Offen bleibt davon unberührt: «Fixkosten» zählt alle Ausgabe-Serien, nicht nur die mit Art-Rolle `fix` (Roadmap C6).

**Tests.** Neu `t25-touch.js`: läuft in einem **echten** Chromium mit Finger-Emulation (`devices['Pixel 7']`, `page.tap()`) und prüft Rechnerzeile, Fokus und beide Klappen. Gegenprobe gemacht: mit der Mechanik aus 1.2.0 schlägt t25 fehl (`30102` statt `30+10*2`), der Test deckt die Ursache also wirklich ab. Der A1-Block ist dafür aus `t24` entfernt — jsdom kennt keine Touch-Vorgaben und liess den Fehler durch; ein Test, der das tut, ist schlechter als keiner. `t25` braucht Playwright und nur `build/index.html` (keine persönlichen Daten, Regel 8), läuft also im Cloud-Container. t18, t21, t22, t23, t24 unverändert grün.

**Was du tun musst.**
1. Veröffentlichen: `git add -A && git commit -m "1.2.1" && git push`.
2. Am Handy prüfen: Version 1.2.1 unter Mehr → Daten, dann Rechnerzeile antippen.
3. Die Brutto-Zeilen kamen erst mit 1.2.2.

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
4. Die Rechnerzeile war fehlerhaft, siehe 1.2.1.

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
