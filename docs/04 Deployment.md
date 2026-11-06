# Deployment (Stand 06.11.2026)

## Lage heute

- Hosting ist **aus**: GitHub Pages abgeschaltet, das alte Repo `jnsxfth/finance-tracking` archiviert. Sein Verlauf enthält die frühere `index.html` mit persönlichen Zahlen. Es wird nie wieder veröffentlicht und nach Roadmap S4 gelöscht.
- Das Handy-PWA kann bis zum neuen Hosting keine Updates holen und zeigt womöglich eine Fehlerseite (der alte Service Worker cacht auch eine 404). Daten in OneDrive und die localStorage-Kopie bleiben unberührt. **Browserdaten der Seite nicht löschen.** Heilt von selbst, sobald unter derselben Adresse wieder eine App liegt.
- Am PC läuft `build/index.html` direkt aus dem Ordner (file://, ohne Service Worker).

## Ablauf für ein Release

1. Quellteil in `src/` ändern.
2. Beide Versionsnummern erhöhen: `APP_VERSION` in `main.js` (`1.1.2 · 06.11.2026`) und `VERSION` in `sw.js` (`1.1.2-2026-11-06`). `build.sh` bricht ab, wenn sie nicht zusammenpassen.
3. `bash src/build.sh` → schreibt nach `build/`.
4. Tests (siehe `01 Architektur.md`).
5. `build/index.html` nach persönlichen Zahlen und Namen durchsuchen (Pflicht, sobald es Hosting gibt).
6. Ausliefern: Inhalt von `build/` dorthin, wo die App geladen wird. Heute: nirgends.
7. Am Gerät unter Mehr → Daten die Versionsnummer prüfen. Steht die alte da, wurde der Service Worker nicht aktualisiert (Schritt 2).

## Ziel nach 1.1.2 (Entscheidung steht aus)

Ein **privates** Repo mit dem ganzen Ordner (`src/`, `docs/`, `tests/`, `build/`). `finanzdaten*.json` und `sicherungen/` stehen in `.gitignore`. Veröffentlicht wird nur `build/`, per GitHub-Actions-Workflow (`upload-pages-artifact`, Pfad `build`). «Deploy from a branch» kann nur `/` oder `/docs` und würde die Dokumente mitveröffentlichen.

GitHub Pro genügt für Actions und für Pages aus privaten Repos. Die Seite selbst bleibt öffentlich erreichbar; Zugriffsschutz gibt es nur mit Enterprise Cloud.

Gleiche Adresse behalten: altes Repo löschen, neues unter demselben Namen anlegen, dann findet das installierte Handy-PWA seine App wieder.

Vor dem ersten Push: `.gitignore` vorhanden, `git status` zeigt keine `finanzdaten*.json`.

## Datensicherung

Die Daten liegen in `finanzdaten.json` in OneDrive, dazu eine Kopie im localStorage des Browsers. Vor jedem Umbau, der Daten anfasst: Kopie nach `sicherungen/` (`finanzdaten.bak-<Anlass>.json`). Ein Release kann die Datei nicht beschädigen, eine fehlerhafte Migration schon.
