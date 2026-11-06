<script>
/* ====================== Startwerte für eine neue Datei ======================
   Diese Listen gelten nur, wenn eine Datei noch keine Kategorien bzw. Konten hat
   (siehe persist.js, loadData). Eine bestehende Datei bringt ihre eigenen mit.

   Absichtlich ohne Beträge: alle Budgets stehen auf 0, damit niemand mit fremden
   Zahlen anfängt. Die Jahreshistorie 2019–2025 stand früher hier im Code; sie liegt
   seit 1.1.1 in der Datendatei unter state.hist (siehe migrate in main.js).      */

const DEFAULT_KATEGORIEN = [
["Wohnen & Kommunikation","Miete inkl. NK","Ausgabe"],["Wohnen & Kommunikation","Strom","Ausgabe"],
["Wohnen & Kommunikation","Internet/TV","Ausgabe"],["Wohnen & Kommunikation","Handy-Abo","Ausgabe"],
["Wohnen & Kommunikation","Serafe","Ausgabe"],["Wohnen & Kommunikation","Streaming","Ausgabe"],
["Versicherungen & Vorsorge","KVG Grundversicherung","Ausgabe"],["Versicherungen & Vorsorge","VVG Zusatzversicherung","Ausgabe"],
["Versicherungen & Vorsorge","Hausrat/Haftpflicht","Ausgabe"],["Versicherungen & Vorsorge","Säule 3a","Ausgabe"],
["Mobilität","ÖV-Abo","Ausgabe"],["Mobilität","Velo/Unterhalt","Ausgabe"],["Mobilität","Auto/Taxi","Ausgabe"],
["Haushalt","Lebensmittel","Ausgabe"],["Haushalt","Haushalt-Nebenkosten","Ausgabe"],
["Gesundheit","Franchise/Selbstbehalt","Ausgabe"],["Gesundheit","Arzt/Zahnarzt/Brille","Ausgabe"],
["Freizeit & Sport","Sport/Hobbys","Ausgabe"],["Freizeit & Sport","Ausgang/Restaurant","Ausgabe"],["Freizeit & Sport","Ferien","Ausgabe"],
["Persönliches","Kleider/Schuhe","Ausgabe"],["Persönliches","Coiffeur/Körperpflege","Ausgabe"],
["Persönliches","Auswärtige Verpflegung","Ausgabe"],["Persönliches","Geschenke/Spenden","Ausgabe"],
["Persönliches","Elektronik","Ausgabe"],["Persönliches","Bücher/Medien","Ausgabe"],
["Persönliches","Weiterbildung/Kurse","Ausgabe"],["Persönliches","Diverses","Ausgabe"],
["Reserven & Sparen","Unvorhergesehenes","Ausgabe"],["Reserven & Sparen","Steuer-Rückstellung","Ausgabe"],
["Reserven & Sparen","Anlegen/Sparen frei","Ausgabe"],
["Einnahmen","Lohn (netto)","Einnahme"],["Einnahmen","13. Monatslohn/Bonus","Einnahme"],
["Einnahmen","Zins/Kapitalertrag","Einnahme"],["Einnahmen","Geschenke erhalten","Einnahme"],
["Einnahmen","Verkauf","Einnahme"],["Einnahmen","Sonstige Einnahmen","Einnahme"]
].map((r,i)=>({id:"k"+i, gruppe:r[0], kategorie:r[1], typ:r[2], budget:0}));

const DEFAULT_KONTEN = ["Lohnkonto","Sparkonto","Kreditkarte","Twint/Bar"].map((n,i)=>({id:"a"+i,name:n}));
