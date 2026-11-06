# Deployment (Stand 06.11.2026, Release 1.1.2)

## Lage

Das alte Repo `jnsxfth/finance-tracking` wird **nicht** weiterverwendet: sein Verlauf enthält eine `index.html` mit der privaten Jahreshistorie und Budgetbeträgen. Pages ist dort aus, das Repo archiviert.

Seit 1.1.2 ist der Code frei von persönlichen Daten (geprüft: `tests/t23-neue-person.js` und eine Textsuche über `build/index.html`). Damit darf wieder veröffentlicht werden.

Der Ordner ist ein Git-Repo mit einem Commit, aber ohne Gegenstelle. `finanzdaten*.json` und `sicherungen/` stehen in `.gitignore`.

## Einmalig: neues Repo aufsetzen

Die Adresse muss `…github.io/finance-tracking/` bleiben, sonst findet das installierte Handy-PWA seine App nicht wieder. Der Name ist also erst freizuräumen.

1. Altes Repo umbenennen (nicht löschen, bis die neue App läuft): Settings → ganz unten *Unarchive* → oben *Repository name* → `finance-tracking-archiv-2026` → Rename → wieder *Archive*.
2. Neues **privates** Repo `finance-tracking` anlegen, ohne README, ohne `.gitignore`.
3. In `development/` (Linux-Shell oder Git Bash):
   ```
   git remote add origin https://github.com/jnsxfth/finance-tracking.git
   git push -u origin main
   ```
4. Im neuen Repo: Settings → Pages → **Source: GitHub Actions**. Der Workflow `.github/workflows/pages.yml` läuft bei jedem Push auf `main`: er bricht ab, falls eine Datendatei im Repo liegt, baut mit `src/build.sh` und veröffentlicht nur `build/`.
5. Unter *Actions* den Lauf abwarten, dann `https://jnsxfth.github.io/finance-tracking/` öffnen und prüfen, ob unter Mehr → Daten die erwartete Version steht.
6. Läuft die App: altes Archiv-Repo löschen (Settings → ganz unten → Delete this repository). Danach ist die Historie auch aus dem Verlauf verschwunden.

**Pro genügt.** Pages aus privaten Repos und Actions sind enthalten. Die veröffentlichte Seite ist trotzdem öffentlich erreichbar — Zugriffsschutz gibt es nur mit Enterprise Cloud. Darum Regel 8: in `build/` nie persönliche Daten.

**«Deploy from a branch» nicht verwenden.** Das kann nur `/` oder `/docs` und würde Quellen und Dokumente mitveröffentlichen.

## Ablauf für ein Release

1. Quellteil in `src/` ändern.
2. Beide Versionsnummern erhöhen: `APP_VERSION` in `main.js` (`1.1.3 · 07.11.2026`) und `VERSION` in `sw.js` (`1.1.3-2026-11-07`). `build.sh` bricht ab, wenn sie nicht zueinander passen.
3. `bash src/build.sh`
4. Tests laufen lassen, siehe `tests/LIESMICH.md`.
5. `build/index.html` nach persönlichen Zahlen und Namen durchsuchen.
6. `git add -A && git commit && git push` — der Workflow baut und veröffentlicht.
7. Am Gerät unter Mehr → Daten die Versionsnummer prüfen. Steht die alte da, wurde der Service Worker nicht erneuert (Schritt 2).

## Git im OneDrive-Ordner

Das Repo liegt in OneDrive. Beim gleichzeitigen Synchronisieren und Arbeiten kann sich `.git` verhaken (`index.lock`). Wenn das passiert: OneDrive kurz pausieren, die `.lock`-Dateien unter `.git/` löschen, Befehl wiederholen. Dauerhafte Abhilfe: in den OneDrive-Einstellungen `development/.git` von der Synchronisierung ausnehmen.

## Datensicherung

Die Daten liegen in `finanzdaten.json` in OneDrive, dazu eine Kopie im localStorage des Browsers. Vor jedem Umbau, der Daten anfasst: Kopie nach `sicherungen/`. In `sicherungen/historie-2019-2025.json` liegt die Jahreshistorie einzeln — nötig, falls je eine Datei von vor 1.1.0 wiederhergestellt wird, denn der Code bringt sie seit 1.1.2 nicht mehr mit. Ein Release kann die Datei nicht beschädigen, eine fehlerhafte Migration schon.
