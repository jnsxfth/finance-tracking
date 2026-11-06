# Designsystem «Spur» (Stand 1.2.1)

Leitgedanke: Jede Zahl in dieser App ist eine Position auf einer Strecke. Ausgegebenes gegen Budget, heute gegen den Monat, Topf gegen Ziel. Das **Mass mit Heute-Marke** ist darum das einzige Schmuckelement, das es gibt. Alles andere ordnet sich unter.

Referenzen waren Revolut (Grösse: die eine Zahl ist gross, der Rest klein) und SBB (Disziplin: eine Grotesk, Tabellenziffern, kein Dekor). Übernommen wurden die Prinzipien, nicht der Look.

## Farben

Die Oberfläche bleibt fast neutral, weil die 14 Kategoriefarben in den Diagrammen schon genug Farbe tragen. Die Werte stehen als CSS-Variablen in `:root` und werden im Dunkelmodus überschrieben.

| Variable | Rolle | Hell | Dunkel |
|---|---|---|---|
| `--bg` | Hintergrund | `#EEF0F2` | `#101316` |
| `--surface` | Fläche | `#FFFFFF` | `#191D21` |
| `--surface-2` | Fläche 2 | `#F2F5F7` | `#232A31` |
| `--border` | Linie | `#D7DDE2` | `#2E353C` |
| `--text` | Text | `#14181C` | `#E9EDF0` |
| `--text-dim` | Text gedämpft | `#5C6670` | `#97A2AC` |
| `--accent` | Akzent (Text, Linien) | `#145FA8` | `#6EB3F5` |
| `--accent-fill` | Akzent (Füllung) | `#1A6FC4` | `#3D8FE0` |
| `--accent-text` | Text auf Akzent | `#FFFFFF` | `#07172B` |
| `--good` | Positiv | `#16754F` | `#4ECB8F` |
| `--bad` | Negativ | `#B23327` | `#F07A6C` |
| `--warn` | Nahe am Limit | `#A06100` | `#E8A93F` |
| `--plan` | Verplant, noch nicht gebucht | `#6B4FA0` | `#AD9BEE` |
| `--track` | Leeres Mass | `#E2E6EA` | `#2A3139` |

Der Akzent war bis v13 Bernstein und ist seit v14 **Blau**. Begründung: Bernstein lag zu nah an `--warn` und liess ruhige Bedienelemente wie Warnungen aussehen.

**Regel: Farbe bedeutet etwas oder wird weggelassen.**

- Neutral: normale Ausgaben. In einem Haushaltsbuch, das zu 95 % aus Ausgaben besteht, liest sich jede rote Zahl wie eine Dauerwarnung.
- Grün: Geld herein, also Einnahme oder Rückerstattung.
- Rot: über dem Plan.
- Bernstein: nahe am Limit, von der Ampel gesetzt.
- Violett: verplant, aber noch nicht gebucht.
- Blau: Bedienelemente und der aktive Reiter. Wertet nicht.

`theme-color` im `<head>` ist je Modus gesetzt (`#FFFFFF` hell, `#191D21` dunkel), damit die Android-Statusleiste passt. Im Manifest steht `#1A6FC4`, das ist die Farbe des Startbildschirms.

## Schrift

**Archivo** variabel von Google Fonts, eine Familie, Breitenachse als Display-Achse:

```
font-family: Archivo,"Helvetica Neue",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
font-variation-settings: "wdth" 100;
```

Fliesstext auf Breite 100, grosse Zahlen auf 104 bis 113, je grösser, desto breiter. Negatives Buchstabenabstand bei grossen Zahlen (`-.022em` bis `-.028em`). `font-variant-numeric: tabular-nums` überall, wo Geld steht, damit Spalten fluchten.

Grössen 12 / 13 / 15 / 17 / 21 / 28 / 42 px. Der Blickfang im Hero liegt bei 2.6 rem.

Fällt die Schrift aus (offline vor dem ersten Laden), greift Helvetica Neue beziehungsweise die Systemgrotesk. Nur die Breitenachse geht verloren, das Layout bleibt. Wer sie vollständig offline will, legt die beiden `.woff2` ins Repo und stellt die Einbindung um.

## Aufbau

- Eine grosse Zahl pro Bildschirm, alles andere 13 bis 15 px.
- Beschriftungen links bündig, alle Zahlen rechts in einer gemeinsamen Spalte.
- Im Geldfluss steht der geplante Betrag gross, der tatsächlich gebuchte klein direkt darunter. Plan und Ist liegen übereinander, nicht nebeneinander.
- Radien: 10 px für Bedienelemente (`--r-ctl`), 14 px für Flächen (`--r-card`). Keine Schatten, keine Verläufe.
- Grundabstand 16 px (`--sp`).
- Navigation mit gezeichneten Symbolen statt Emoji, aktiver Reiter mit einer Marke oben.
- Verwaltungskarten auf dem Konten-Bildschirm sind `details`-Elemente und standardmässig zu. Der Bildschirm war vorher zu scroll-lastig.
- **Rechnerzeile** (`.calcbar`, seit 1.2.0): sieben gleich breite Knöpfe `+ − × ÷ ( ) ⌫` direkt unter dem Betragsfeld, Fläche `--surface-2`, Radius 8 px, 40 px hoch. Sichtbar nur, solange das Feld den Fokus hat — sonst steht sie den ganzen Tag im Formular herum. Ihre Knöpfe reagieren auf `pointerdown`, nicht auf `click`; der Grund steht in `01 Architektur.md`, Android-Falle 5.
- **Klappen tragen ihr Wichtigstes im Kopf** (seit 1.2.1). Eine Kennzahlen-Kachel zeigt den Blickfang offen und den Rest in einer Klappe; deren `summary` führt eine Kurzfassung in `.sum` mit («Einnahmen +2900 · Überträge auf 2 Konten», «· 7 Posten»). Wer nicht öffnet, soll trotzdem wissen, ob sich das Öffnen lohnt.
- **Aufleuchten** (`.flash`, seit 1.2.0): öffnet ein Bearbeiten-Knopf ein Formular, läuft die Karte 1,1 s von `--surface-2` mit Akzentrand auf ihren Normalzustand zurück. Die Überschrift des Formulars (`.formtitel`) heisst dann «Bearbeiten: <Name>». Kein Schatten, keine Bewegung.

## Blickfang je Bildschirm

| Bildschirm | Die eine Zahl |
|---|---|
| Erfassen | das Betragsfeld, 30 px, ganz oben |
| Budget | «noch frei für den Rest von …» auf dem Mass mit Heute-Marke |
| Konten | Vermögen heute |
| Analyse | Summe des Zeitraums |

## Das Mass

Zwei Segmente auf einer Spur: `.f` für Gebuchtes, `.p` für Verplantes, dazu `.tick` als senkrechte Heute-Marke. Die Marke sitzt beim zeitlichen Anteil des Monats. Steht die Füllung links davon, bin ich im Plan.

## Signet

Zwei Masse unterschiedlicher Füllung, eine senkrechte Heute-Marke quer darüber, auf blauem Quadrat `#1A6FC4`. Das ist die These der App als Zeichen: 46 % verbraucht, der Monat steht bei 70 %, also alles im Plan. Lesbar bis 16 px. Liegt als `icon-192.png` und `icon-512.png` im Repo.
