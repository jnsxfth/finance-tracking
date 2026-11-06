# Changelog

Neueste oben. Pro Eintrag: Anlass, Änderungen, Tests, was der Nutzer tun muss.

## 1.1.1 · 06.11.2026

**Anlass.** Die Jahreshistorie 2019–2025 und Budgetzahlen standen in `data.js` und damit in der öffentlich ausgelieferten `index.html`. Sie müssen aus dem Code in die Datei.

- `migrate()` legt `state.hist` aus den Code-Konstanten an (`HIST_AUS/EIN/VERM`); `jahrTotal`, `istKat`, `vermoegenAnzeige`, `renderVermoegen` lesen daraus. (1.1.0)
- `loadData()` speichert frisch angelegte Historie sofort (`HIST_NEU`). Vorher wäre sie bis zur nächsten Buchung nur im Arbeitsspeicher gewesen.
- Service Worker cacht und liefert keine Fehlerseiten (404) mehr, solange eine gute Fassung im Cache liegt.
- `build.sh`: schreibt nach `build/`, prüft die Versionsnummern gegeneinander, nutzt `/tmp` für Zwischendateien, löscht im Projekt nichts.
- Ordner umgebaut: `docs/`, `build/` (erzeugt), `sicherungen/`, `README.md`, `.gitignore`; Icons nach `src/`.
- Tests: neu `t21-hist-sichern`, `t22-sw-fehlerseite`; `t18` läuft auf neuem Pfad. Alle grün. Jahressummen 2019–2025 und Vermögen 2025 stimmen mit den Code-Konstanten überein.

**Du:** App mit der Live-Datei öffnen, unter Mehr → Daten `1.1.1 · 06.11.2026` prüfen. Danach die Live-Datei nach `development/finanzdaten.json` kopieren (überschreiben), damit `hist` geprüft werden kann. Erst dann folgt 1.1.2 (Konstanten löschen).

## 1.0.1 · 05.11.2026

Android-Schreibprüfung über `meta.rev` statt Zeichenzahl, dreistufiges Abschneiden, Banner zum Wiederverbinden. Am 06.11.2026 auf dem Handy bestätigt.

## 1.0.0 · 05.11.2026

Siehe `docs/03 Funktionsumfang.md`.
