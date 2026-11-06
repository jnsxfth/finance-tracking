# Tests

Node-Skripte mit Playwright, keine Test-Bibliothek. Playwright gibt es nur im Cloud-Container,
nicht in der Shell auf diesem Rechner: `build/index.html`, `build/sw.js` und bei Bedarf
`finanzdaten.json` dorthin holen und die Skripte dort laufen lassen. Die Datendatei wird nur gelesen.

| Test | Prüft | Aufruf |
|---|---|---|
| `t18-schreibpruefung.js` | Schreibprüfung über `meta.rev`, Abschneiden, Wiederverbinden-Banner | `node t18… <index.html>` |
| `t21-historie.js` | Historie in der Datei: Buchungsjahre unabhängig davon, Jahre ohne Buchungen aus der Historie, Vermögensverlauf, leere Fächer ohne Historie | `node t21… <index.html> <finanzdaten.json>` |
| `t22-sw-fehlerseite.js` | Service Worker legt keine Fehlerseite (404) über die gute Fassung | `node t22… <sw.js>` |
| `t23-neue-person.js` | Erststart ohne Datei: Startkategorien ohne Budget, keine persönlichen Namen, alle sechs Bildschirme rendern | `node t23… <index.html>` |

Exitcode 1 bei Fehlschlag. `page.on('pageerror')` gesammelte JS-Fehler zählen immer als Fehlschlag.
Erwartungswerte nie im Test hinterlegen, sondern aus der Datei rechnen (Regel 8: keine Beträge im Code).

Die Reihe t9–t17 ist verloren (lief gegen die private Datei). Ersatz ist Roadmap I1.
