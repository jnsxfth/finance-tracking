# Finanz-Tracker: Entwicklungsordner

Einzige Quelle der Wahrheit für Code und Dokumente. Das claude.ai-Projekt enthält nur eine Spiegelung von `docs/`.

```
development/
├─ README.md          dieser Text
├─ CHANGELOG.md       was jedes Release geändert hat
├─ .gitignore         hält finanzdaten*.json und sicherungen/ aus Git
├─ docs/              00 Projektanweisung … 05 Roadmap
├─ src/               Quellteile (nie index.html bearbeiten)
├─ build/             ERZEUGT von src/build.sh: das ist die App
├─ tests/             Node-/Playwright-Skripte
```

## Befehle

```
bash src/build.sh        # baut nach build/ und prüft IDs, JS, Versionsnummern
```

Tests brauchen Playwright und laufen im Cloud-Container, siehe `docs/01 Architektur.md`.

## Neuer Chat

Ordner im Claude-Desktop verbinden («+» neben dem Nachrichtenfeld → Ordner hinzufügen), dann nur den Build nennen: **«Baue 1.2.0 nach Roadmap.»** Claude liest `docs/00 Projektanweisung.md` und `docs/05 Roadmap.md` selbst und nimmt die Punkte, die dort unter diesem Build stehen. Ein Build pro Chat.

## Nie öffentlich

`finanzdaten*.json`, `sicherungen/`. Und: alles in `build/` ist öffentlich, sobald es Hosting gibt.
