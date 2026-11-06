# Deployment (Stand 06.11.2026, Release 1.1.2)

## Lage

Das alte Repo `jnsxfth/finance-tracking` wird **nicht** weiterverwendet: sein Verlauf enthält eine `index.html` mit der privaten Jahreshistorie und Budgetbeträgen. Pages ist dort aus, das Repo archiviert.

Seit 1.1.2 ist der Code frei von persönlichen Daten (geprüft: `tests/t23-neue-person.js` und eine Textsuche über `build/index.html`). Damit darf wieder veröffentlicht werden.

Der Ordner ist ein Git-Repo mit einem Commit, aber ohne Gegenstelle. `finanzdaten*.json` und `sicherungen/` stehen in `.gitignore`.

## Einmalig: neues Repo aufsetzen

Das alte Repo ist am 06.11.2026 gelöscht worden (S5 damit erledigt, die Historie ist aus dem Verlauf verschwunden). Der Name ist frei. **Nichts von Hand kopieren:** der Ordner ist ein Git-Repo, `git push` überträgt genau die richtigen Dateien.

Die Adresse muss `…github.io/finance-tracking/` bleiben, sonst findet das installierte Handy-PWA seine App nicht wieder. Das Repo muss also wieder `finance-tracking` heissen.

**Weg A, GitHub Desktop** (legt das Repo gleich mit an):

1. *File → Add local repository* → `C:\Users\Jonas\OneDrive\Finance-Tracking\development`. Es erscheinen drei Commits.
2. *Publish repository* → Name `finance-tracking`, **«Keep this code private» angekreuzt** → *Publish*.

**Weg B, Git auf der Kommandozeile:**

1. Auf GitHub ein **privates** Repo `finance-tracking` anlegen — leer, ohne README und ohne `.gitignore`.
2. Im Ordner `development`:
   ```
   git remote add origin https://github.com/jnsxfth/finance-tracking.git
   git push -u origin main
   ```

Existiert das Repo schon und ist nicht leer, lehnt der Push ab. Dann entweder das leere Repo löschen und neu anlegen, oder `git push -u --force origin main` — der lokale Stand ist der gültige.

**Danach in beiden Fällen:**

3. Settings → Pages → **Source: GitHub Actions**. Der Workflow `.github/workflows/pages.yml` läuft bei jedem Push auf `main`: er bricht ab, falls eine Datendatei im Repo liegt, baut mit `src/build.sh` und veröffentlicht nur `build/`.
4. Unter *Actions* den Lauf abwarten (grüner Haken), dann `https://jnsxfth.github.io/finance-tracking/` öffnen und unter Mehr → Daten die Version prüfen.

**Scheitert der erste Lauf mit «Get Pages site failed»** (`configure-pages`, Schritt 5), war Pages beim Start noch nicht auf GitHub Actions gestellt. Seit dem Commit vom 06.11. schaltet der Workflow Pages über `enablement: true` selbst ein; es genügt, den Lauf zu wiederholen: *Actions* → fehlgeschlagener Lauf → *Re-run all jobs*. Bleibt es dabei, in Settings → Pages prüfen, ob als *Source* **GitHub Actions** steht.
5. Auf dem Handy die App öffnen. Zeigt sie noch die alte Fassung: Mehr → Daten → *Nach Updates suchen*, dann *Jetzt aktualisieren*.

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
