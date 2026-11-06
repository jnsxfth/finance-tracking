#!/bin/bash
# Baut aus den Quellteilen in src/ die auslieferbare App in ../build/ und prüft sie.
# Aufruf: bash src/build.sh   (von überall)
# Zwischendateien liegen in einem Temp-Ordner ausserhalb des Projekts: der Build muss
# im Projektordner nie etwas löschen (verbundene Ordner erlauben das nicht immer).
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$SRC/../build"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

python3 - "$SRC" "$TMP" <<'PY'
import sys
src, tmp = sys.argv[1], sys.argv[2]
main = open(src + '/main.js', encoding='utf-8').read()
for marke, datei in [('/*__PHASE1__*/', 'phase1.js'),
                     ('/*__PHASE34__*/', 'phase34.js'),
                     ('/*__PHASE5__*/', 'phase5.js')]:
    assert marke in main, 'Platzhalter fehlt: ' + marke
    main = main.replace(marke, open(src + '/' + datei, encoding='utf-8').read(), 1)
open(tmp + '/main_build.js', 'w', encoding='utf-8').write(main)
PY

cat "$SRC/head.html" "$SRC/data.js" "$SRC/persist.js" "$TMP/main_build.js" > "$OUT/index.html"
cp "$SRC/sw.js" "$SRC/manifest.webmanifest" "$SRC/icon-192.png" "$SRC/icon-512.png" "$OUT/"
# Jekyll darf die fertigen Dateien nicht anfassen. Wirkt nur beim Veroeffentlichen
# aus einem Branch; ueber GitHub Actions laeuft Jekyll ohnehin nicht.
touch "$OUT/.nojekyll"

python3 - "$OUT/index.html" "$TMP/ex.js" "$SRC/sw.js" <<'PY'
import re, sys
html_pfad, ex_pfad, sw_pfad = sys.argv[1:4]
h = open(html_pfad, encoding='utf-8').read()
open(ex_pfad, 'w', encoding='utf-8').write(''.join(re.findall(r'<script>(.*?)</script>', h, re.S)))
ids  = set(re.findall(r'id="([A-Za-z0-9_-]+)"', h))
used = set(re.findall(r"\$\('([A-Za-z0-9_-]+)'\)", h)) | set(re.findall(r"getElementById\('([A-Za-z0-9_-]+)'\)", h))
fehlt = sorted(used - ids - {'toastMsg'})      # toastMsg wird zur Laufzeit erzeugt
print('fehlende IDs:', fehlt if fehlt else 'keine')
ver = re.search(r"APP_VERSION='([^']+)'", h)
print('APP_VERSION:', ver.group(1) if ver else '?!')
print('Grösse:', len(h), 'Zeichen')
# Regel 2: beide Versionsnummern müssen zusammenpassen ('1.1.1 · 06.11.2026' <-> '1.1.1-2026-11-06')
sw = re.search(r"VERSION\s*=\s*'([^']+)'", open(sw_pfad, encoding='utf-8').read())
erwartet = None
if ver:
    m = re.match(r'(\S+) · (\d\d)\.(\d\d)\.(\d{4})', ver.group(1))
    if m: erwartet = f'{m.group(1)}-{m.group(4)}-{m.group(3)}-{m.group(2)}'
print('sw.js VERSION:', sw.group(1) if sw else '?!', '| erwartet:', erwartet)
if fehlt or not sw or sw.group(1) != erwartet:
    print('FEHLER: fehlende IDs oder Versionsnummern passen nicht zusammen'); sys.exit(1)
PY

node --check "$TMP/ex.js" && echo "JS OK"
echo "Fertig: $OUT"
