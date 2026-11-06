# Projektanweisung Finanz-Tracker

Text für das Feld «Projektanweisungen» des Projekts: alles unterhalb der Linie. Für Claude geschrieben.

---

## Was das Projekt ist

Lokaler, abofreier Finanz-Tracker: eine HTML-Datei als PWA für Android und PC, Zahlen in einer JSON-Datei in OneDrive. Kein Konto, kein Abo, kein fremder Server. Aktueller Stand: siehe `CHANGELOG` (zuletzt **1.1.1, 06.11.2026**).

Nutzer: 26, Basel-Stadt, zieht in eine 2er-WG, ein Arbeitgeber. Ersetzt die App «Meine Finanzen».

## Wie ich arbeiten will

Antworte sachlich und kritisch. Hinterfrage oft genug, um mit möglichst wenig Prompts den bestmöglichen Output zu erzeugen. Nimm keine Rücksicht auf meine Gefühle. Optimiere auf minimalen Token-Verbrauch, ohne Wichtiges wegzulassen.

Widerspreche, wenn eine Idee von mir die App verschlechtert. Lieber ein Satz Begründung als ein stillschweigend eingebauter Fehler.

## Wo was liegt

- **Code und Dokumente liegen im lokalen Ordner** `C:\Users\Jonas\OneDrive\Finance-Tracking\development`. Das ist die einzige Quelle der Wahrheit. Das Projekt enthält nur die Dokumente (`00`–`06`), keinen Code.
- Zu Beginn prüfen, ob der Ordner verbunden ist (`get_device_info`). Fehlt er: mich bitten, ihn zu verbinden («+» neben dem Nachrichtenfeld → Ordner hinzufügen). Nie Code aus dem Gedächtnis oder aus alten Chats rekonstruieren.
- Auf dem Rechner läuft nur eine Linux-Shell (git, node, python; **kein Playwright**). Tests laufen im Cloud-Container: `build/index.html` und was der Test braucht per `device_stage_files` holen. Löschen im Ordner geht nur nach `device_request_delete_permission`; der Build braucht es nicht.
- `finanzdaten.json` im Ordner ist eine Arbeitskopie: nur lesen, nie überschreiben, nicht verschieben. Vor jedem Test oder Umbau, der sie anfasst, eine Kopie nach `sicherungen/`.

## Vor dem ersten Code

Lies `docs/05 Roadmap.md` (Stand und nächster Schritt) und `docs/01 Architektur.md`, dann nur die betroffenen Quellteile. `03 Funktionsumfang.md` nur, wenn du wissen musst, was es schon gibt. `02 Designsystem.md` vor jeder Änderung an der Oberfläche. `index.html` ist **erzeugt** und wird nie bearbeitet.

## Regeln, die nicht verhandelbar sind

1. **Kein Framework, keine Abhängigkeit, kein Build-Werkzeug.** Vanilla JS, eine Datei. Ausnahme ist die Schrift Archivo von Google Fonts, mit Fallback.
2. **Bei jedem Release zwei Versionsnummern erhöhen**: `APP_VERSION` in `main.js` und `VERSION` in `sw.js`. `build.sh` bricht ab, wenn sie nicht zusammenpassen.
3. **Nach jeder Änderung bauen und prüfen**: `bash src/build.sh` (schreibt nach `build/`; bricht ab bei fehlender Element-ID, JS-Fehler, ungleichen Versionen). Dazu vorhandene Tests laufen lassen und die betroffene Logik per Playwright gegen die echte `finanzdaten.json` prüfen.
4. **Namen auf Deutsch**, wie der bestehende Code. `betrag`, `kategorieId`, `topfStand`. Kein Mischmasch.
5. **Keine Datenwanderung ohne Migration.** Jedes neue Feld bekommt in `migrate()` einen Standardwert. Die Datei ist über ein Jahr alt und darf nie kaputtgehen.
6. **Ausgaben bleiben neutral.** Rot heisst «über dem Plan», Grün heisst «Geld herein». Nicht jede Ausgabe anmalen.
7. **Nichts erfinden.** Keine Beispielzahlen in meine Daten, keine geratenen Kategorien, keine Platzhalterbeträge.
8. **Keine persönlichen Daten an öffentlichen Orten.** Was in `build/` liegt, ist öffentlich, sobald es Hosting gibt. Keine Beträge, Kontonamen oder Titel aus `finanzdaten.json` in Code, Tests, Dokumenten oder Commits; Tests lesen die Datei zur Laufzeit. Vor jeder Veröffentlichung `build/index.html` nach Zahlen und Namen durchsuchen. `finanzdaten*.json` und `sicherungen/` bleiben in `.gitignore`.
9. **Eine Quelle erst löschen, wenn ihr Inhalt nachweislich in der Datei steht.** Und: `migrate()` allein schreibt nichts; Daten, die aus dem Code in die Datei wandern, müssen sofort gespeichert werden (`HIST_NEU`-Muster).

## Abschlussroutine nach jeder Aufgabe, ungefragt

1. Build und Tests grün, beide Versionsnummern erhöht.
2. `CHANGELOG.md`: Eintrag mit Anlass, Änderungen, Tests, was ich tun muss.
3. `docs/05 Roadmap.md` aktualisieren (Status, nächster Schritt); `01`, `03`, `04` nur bei dauerhaften Änderungen. Dokumente im Ordner ändern und ins Projekt spiegeln (`06 Changelog.md` = `CHANGELOG.md`).
4. Veraltetes löschen statt ergänzen. Keine Code-Kopien im Projekt. Keine Zwischendateien im Ordner.
5. Antwort an mich: was fertig ist, was ich tun oder testen muss, nächster Schritt. In dieser Reihenfolge, kurz.

## Auslieferung

Fertig ist, was in `build/` liegt (`index.html`, `sw.js`, Manifest, Icons). Kein ZIP nötig. Wohin damit: `docs/04 Deployment.md`.

## Was ich nicht will

Kursabfragen, Mehrwährung, mehrere Nutzer, Bankanbindung, Verschlüsselung der Datei. Alles schon verworfen. Frag nicht erneut danach, ausser ich bringe es selbst auf.
