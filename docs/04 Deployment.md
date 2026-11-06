# Deployment (Stand 06.11.2026, Release 1.1.2)

## Lage

Das alte Repo `jnsxfth/finance-tracking` wird **nicht** weiterverwendet: sein Verlauf enthält eine `index.html` mit der privaten Jahreshistorie und Budgetbeträgen. Pages ist dort aus, das Repo archiviert.

Seit 1.1.2 ist der Code frei von persönlichen Daten (geprüft: `tests/t23-neue-person.js` und eine Textsuche über `build/index.html`). Damit darf wieder veröffentlicht werden.

Der Ordner ist ein Git-Repo mit einem Commit, aber ohne Gegenstelle. `finanzdaten*.json` und `sicherungen/` stehen in `.gitignore`.

## Wie veröffentlicht wird (Stand 06.11.2026)

Repo: **privat**, `jnsxfth/finance-tracking`. Das alte Repo ist gelöscht, die Historie damit auch aus dem Verlauf verschwunden.

Veröffentlicht wird über den Zweig **`gh-pages`**: `.github/workflows/pages-zweig.yml` läuft bei jedem Push auf `main`, baut mit `src/build.sh` und legt nur den Inhalt von `build/` in diesen Zweig. GitHub veröffentlicht den Zweig über seine ältere Pipeline (`pages-build-deployment`). Einstellung: Settings → Pages → Source **«Deploy from a branch»**, Branch **`gh-pages`**, Ordner **`/ (root)`**.

**Warum nicht der offizielle Weg.** `pages.yml` benutzt `upload-pages-artifact` und `deploy-pages`. Build und Artefakt-Upload gelingen, aber das Anlegen des Deployments bleibt in `deployment_queued` hängen und bricht mit «Deployment failed, try again later» ab — ein Fehler bei GitHub, der am 06.11.2026 mehrfach auftrat, auch nach Aus- und Wiedereinschalten von Pages. Der Workflow ist darum geparkt und läuft nur noch von Hand. Wenn GitHub das behoben hat: `pages.yml` von Hand starten; läuft er durch, Source zurück auf «GitHub Actions» stellen und `pages-zweig.yml` wieder auf `workflow_dispatch` beschränken. **Nie beide Wege gleichzeitig veröffentlichen lassen.**

`.nojekyll` liegt in `build/` (von `build.sh` erzeugt): beim Veröffentlichen aus einem Zweig läuft sonst Jekyll über die fertigen Dateien. Über GitHub Actions wäre das belanglos, aus einem Zweig nicht.

**Branch `main` nicht als Pages-Quelle wählen** — damit würden `docs/` und `src/` mitveröffentlicht.

**Pro genügt.** Pages aus privaten Repos ist enthalten. Die veröffentlichte Seite ist trotzdem öffentlich erreichbar; Zugriffsschutz gibt es nur mit Enterprise Cloud. Darum Regel 8: in `build/` nie persönliche Daten.

## Ablauf für ein Release

1. Quellteil in `src/` ändern.
2. Beide Versionsnummern erhöhen: `APP_VERSION` in `main.js` (`1.1.3 · 07.11.2026`) und `VERSION` in `sw.js` (`1.1.3-2026-11-07`). `build.sh` bricht ab, wenn sie nicht zueinander passen.
3. `bash src/build.sh`
4. Tests laufen lassen, siehe `tests/LIESMICH.md`.
5. `build/index.html` nach persönlichen Zahlen und Namen durchsuchen.
6. `git add -A && git commit && git push` — `pages-zweig.yml` baut und veröffentlicht; danach läuft GitHubs `pages-build-deployment`.
7. Am Gerät unter Mehr → Daten die Versionsnummer prüfen. Steht die alte da, wurde der Service Worker nicht erneuert (Schritt 2).

## Git im OneDrive-Ordner

Das Repo liegt in OneDrive. Beim gleichzeitigen Synchronisieren und Arbeiten kann sich `.git` verhaken (`index.lock`). Wenn das passiert: OneDrive kurz pausieren, die `.lock`-Dateien unter `.git/` löschen, Befehl wiederholen. Dauerhafte Abhilfe: in den OneDrive-Einstellungen `development/.git` von der Synchronisierung ausnehmen.

## Datensicherung

Die Daten liegen in `finanzdaten.json` in OneDrive, dazu eine Kopie im localStorage des Browsers. Vor jedem Umbau, der Daten anfasst: Kopie nach `sicherungen/`. In `sicherungen/historie-2019-2025.json` liegt die Jahreshistorie einzeln — nötig, falls je eine Datei von vor 1.1.0 wiederhergestellt wird, denn der Code bringt sie seit 1.1.2 nicht mehr mit. Ein Release kann die Datei nicht beschädigen, eine fehlerhafte Migration schon.
