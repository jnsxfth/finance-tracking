# Tests

Node-Skripte gegen die Playwright-API, keine Test-Bibliothek. Playwright selbst gibt es hier
nicht, darum liegt `pw-jsdom.js` daneben: ein Ersatz auf jsdom, der genau die benutzten Aufrufe
abdeckt. Einmalig `npm install jsdom` ausserhalb des Projektordners, dann:

```
cd <projektordner>
NODE_PATH=<dort>/node_modules node -r ./tests/pw-jsdom.js tests/t24-bedienung.js build/index.html finanzdaten.json
```

Mit echtem Playwright laufen dieselben Dateien ohne `-r`. Die Datendatei wird nur gelesen.

`t25-touch.js` braucht **echtes** Playwright (Touch-Emulation) und läuft am jsdom-Ersatz
bewusst nicht an. Es reicht `build/index.html`: die enthält keine persönlichen Daten.

| Test | Prüft | Aufruf |
|---|---|---|
| `t18-schreibpruefung.js` | Schreibprüfung über `meta.rev`, Abschneiden, Wiederverbinden-Banner | `node t18… <index.html>` |
| `t21-historie.js` | Historie in der Datei: Buchungsjahre unabhängig davon, Jahre ohne Buchungen aus der Historie, Vermögensverlauf, leere Fächer ohne Historie | `node t21… <index.html> <finanzdaten.json>` |
| `t22-sw-fehlerseite.js` | Service Worker legt keine Fehlerseite (404) über die gute Fassung | `node t22… <sw.js>` |
| `t23-neue-person.js` | Erststart ohne Datei: Startkategorien ohne Budget, keine persönlichen Namen, alle sechs Bildschirme rendern | `node t23… <index.html>` |
| `t24-bedienung.js` | `formOeffnen`, Überträge netto, Brutto-Zeilen samt Gegenstücken, Klicksperre (drei Tipps → eine Buchung), kompaktes JSON, Rückgängig | `node t24… <index.html> <finanzdaten.json>` |
| `t25-touch.js` | nur echter Browser: Rechnerzeile am Finger, Fokus bleibt im Feld, Klappen auf «Wiederk.» | `node t25… <index.html>` |

Exitcode 1 bei Fehlschlag. `page.on('pageerror')` gesammelte JS-Fehler zählen immer als Fehlschlag.
Erwartungswerte nie im Test hinterlegen, sondern aus der Datei rechnen (Regel 8: keine Beträge im Code).

Die Reihe t9–t17 ist verloren (lief gegen die private Datei). Ersatz ist Roadmap I1.
