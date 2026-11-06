# Funktionsumfang, Grenzen, offene Punkte (Stand 1.2.1, 06.11.2026)

## Was die App kann

**Erfassen.** Betrag als Blickfang mit Rechner im Feld (`30+10+5.50`), auf dem Handy über eine Knopfzeile `+ − × ÷ ( ) ⌫` unter dem Feld. Eine gelöschte Buchung lässt sich zehn Sekunden lang zurückholen. Knöpfe, die speichern, sind während des Speicherns gesperrt, darum erzeugt ein zweiter Tipp keine zweite Buchung. Belege aufteilen: Gesamtbetrag oben, Teilbeträge auf weitere Kategorien, Knopf «Rest» füllt die Differenz. Vorlagen, Tags, Notizen, Suche, einklappbarer Filter.

**Geldfluss.** Jede Kategorie gehört zu einer **Art**, die ihre Rolle bestimmt: planbar, variabel oder Rücklage, dazu der Schalter «zählt als Ausgabe». Arten sind frei definierbar; Steuern laufen getrennt von Sparen und von Vorsorge. Der Blickfang im Budget heisst «noch frei», Verplantes ist schon abgezogen.

**Budgets** pro Kategorie, monatlich oder jährlich, mit Übertrag in Prozent und Versionierung ab Monat, sodass frühere Monate unverändert bleiben. Ampel gegen das zeitanteilige Soll.

**Konten und Töpfe.** Bankkonten und Anlagekonten (Wert von Hand erfassen, Gewinn und Verlust wird gerechnet). Töpfe reservieren Geld innerhalb eines Kontos, etwa Notgroschen oder Steuern, ohne eigenes Bankkonto. Zwölf-Monats-Verlauf je Konto, Karten eingeklappt.

**Daueraufträge** mit automatischem oder bestätigtem Verbuchen, einzelne Termine anpassen oder überspringen. Überträge erscheinen je Konto netto pro Monat (Zufluss minus Rückbuchung), Topf-Daueraufträge als Unterzeile. Auf «Wiederk.» steht oben die Fixkostenzahl, alles Weitere in Klappen: «Wiederkehrend im Detail» und «Erkannte Muster».

**Rückerstattungen und Gegenbuchungen.** Eine Rückerstattung senkt nur die Ausgaben ihrer eigenen Kategorie. Eine Gegenbuchung holt Geld aus einer Kategorie zurück, wenn zwischen eigenen Konten umgeschichtet wird: 100 aufs Depot und 80 vom Sparkonto zurück sind netto 20 gespart.

**Analyse.** Verteilung, grösste Posten, Verlauf je Monat und Jahr, Fixkostenanteil, wiederkehrende Posten, Verlauf je Kategorie.

**Planen.** «Was wäre wenn» rechnet einen anderen Monatslohn gegen die heutigen Budgets und nennt die grössten Hebel. Die Mustererkennung findet wiederkehrende Posten ohne Dauerauftrag und übernimmt sie ins Formular.

**Sparziele** mit Fortschritt, nötiger Monatsrate gegen die tatsächliche Sparrate und Prognosedatum. Ein Ziel kann den Stand eines Topfes ablesen.

**Daten.** Datei über die File System Access API, Konflikterkennung über eine Revisionsnummer, Prüfung nach jedem Schreiben, tolerantes Lesen bei beschädigten Dateien, JSON- und CSV-Export, Import aus «Meine Finanzen» inklusive Kategorien-Zuordnung. Jahreshistorie 2019 bis 2025 auf Jahresebene, nur lesbar; liegt seit 1.1.1 in der Datei (`state.hist`), seit 1.1.2 nicht mehr im Code. Sie wirkt nur für Jahre ohne Buchungen sowie im Vermögensverlauf.

## Bewusst nicht enthalten

Kursabfragen (verworfen, weil jede Quelle entweder Geld kostet oder unzuverlässig ist), Mehrwährung, mehrere Nutzer, Bankanbindung, Verschlüsselung der Datei. Nicht erneut vorschlagen.

## Bekannte Grenzen

- Mustererkennung arbeitet über den Titel. Posten, die pro Monat anders heissen («Abo September»), erscheinen als jährlich. Beim Übernehmen den Rhythmus korrigieren.
- Kontoverlauf beginnt beim Stichtag des Kontos; davor gibt es keine Daten.
- Archivo braucht beim ersten Öffnen Netz. Danach liegt sie im Browser-Cache.
- Eine Rückerstattung ohne passende Ausgabe im selben Monat schreibt keinem Budget etwas gut und wird separat ausgewiesen.
- Rückgängig gilt nur für die zuletzt gelöschte Buchung und nur zehn Sekunden lang; danach hilft nur eine Sicherung.
- Speichern dauert auf dem Handy weiterhin spürbar lange. Gemessen und beschleunigt wird in 1.2.2 (A4 Punkt 3 bis 5).
- «Fixkosten pro Monat» zählt alle wiederkehrenden Ausgaben, nicht nur die mit Art-Rolle `fix`. Darum ist «Wiederkehrende Ausgaben» in der Klappe dieselbe Zahl.
- Die Dateifreigabe verfällt auf Android bei jedem App-Start. Nicht lösbar, siehe `01 Architektur.md`.

## Was ich noch selbst in der App tun muss

Nicht Claudes Aufgabe, aber Kontext für Rückfragen. Diese Punkte stammen aus dem Update auf 1.0.0 und sind teils noch offen.

- **Planlohn setzen** (Budget-Reiter). Ohne ihn rechnet «Was wäre wenn» nichts.
- Beim Autoinvest-Dauerauftrag Sparkonto → Lohnkonto die Checkbox **Gegenbuchung** setzen, sonst zählt die Umschichtung als Sparen.
- Töpfe «Notgroschen» und «Steuern» im Sparkonto anlegen, dazu ein Dauerauftrag Lohnkonto → Sparkonto mit Topf und ohne Kategorie.
- Budgetsumme 4'213 CHF pro Monat gegen den echten Lohn prüfen.
- Steuer-Rückstellung 580 pro Monat plausibilisieren (ESTV Basel-Stadt; der Wohnsitz am 31.12. zählt fürs ganze Jahr).
- ÖV-Abo 824 pro Jahr gegen ein GA von rund 4'100 pro Jahr rechnen.
- Kategorie «13. Monatslohn/Bonus» löschen, Rest aus dem Import.
- Geratene Arten prüfen: Fitness/Verein, AHV, Weiterbildung.

Siehe `05 Roadmap.md`.

## Versionshistorie, grob

v7 bis v13 waren die Vorstufen: Cache-Problem gelöst (Versionsanzeige und Aktualisieren-Knopf), Rückerstattungen kategorie-rein verrechnet, tolerantes Lesen eingeführt, Beleg-Aufteilung auf Gesamtbetrag umgebaut, Essens-Kategorien neu geordnet, Revolut aufgelöst, Rechner im Betragsfeld.

v14 bis 1.0.0 war die Roadmap in fünf Phasen: Arten und Töpfe und Geldfluss, frei definierbare Arten, Planbuchungen mit Ampel und Kontoverlauf, kompakter Konten-Bildschirm und Gegenbuchungen, Plan-Szenario und Mustererkennung. Dazu der Akzentwechsel auf Blau und klarere Schriftfarben für kritische Beträge.

1.0.1 hat ausschliesslich die Android-Schreibprüfung korrigiert, siehe `01 Architektur.md`, Abschnitt Android-Fallen.

Ab 1.1.0 siehe `CHANGELOG.md`. 1.2.0 war der Bedienungs-Build: Rechnerzeile, sichtbares Bearbeiten, Nettoüberträge, Klicksperre, Rückgängig. 1.2.1 hat die Rechnerzeile am Finger reparieren müssen und «Wiederk.» auf Klappen umgestellt.
