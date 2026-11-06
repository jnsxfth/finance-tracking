# Changelog

Neueste oben. Pro Eintrag: Anlass, Änderungen, Tests, was der Nutzer tun muss.

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

**Du:** Repo neu aufsetzen nach `docs/04 Deployment.md`, dann App unter der alten Adresse öffnen und `1.1.2 · 06.11.2026` prüfen.

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
