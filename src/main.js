/* ============================= Helfer ============================= */
const APP_VERSION='1.2.1 · 06.11.2026';
let SWREG=null;
const $ = id => document.getElementById(id);
const qsa = s => [...document.querySelectorAll(s)];
function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtCHF(n){ return (Math.round(n*100)/100).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmt0(n){ return Math.round(n).toLocaleString('de-CH'); }
function fmtDatum(iso){ const p=String(iso).split('-'); return p.length===3 ? p[2]+'.'+p[1]+'.'+p[0] : iso; }
const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function isoVon(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const TODAY = isoVon(new Date());
function addDays(iso,n){ const [y,m,d]=iso.split('-').map(Number); const dt=new Date(y,m-1,d); dt.setDate(dt.getDate()+n); return isoVon(dt); }
function addMonths(iso,n){
  const [y,m,d]=iso.split('-').map(Number);
  const ziel=new Date(y,m-1+n,1);
  const letzter=new Date(ziel.getFullYear(),ziel.getMonth()+1,0).getDate();
  ziel.setDate(Math.min(d,letzter));
  return isoVon(ziel);
}
function monatsEnde(jahr,monat){ return isoVon(new Date(jahr,monat,0)); }
function katById(id){ return state.kategorien.find(k=>k.id===id); }
function katLookup(name){ return state.kategorien.find(k=>k.kategorie===name); }
function kontoByName(n){ return state.konten.find(a=>a.name===n); }
/* ---------- Budget-Versionen: jede Änderung gilt ab einem Monat, die Vergangenheit bleibt ---------- */
const ymKey=(j,m)=>j*100+m;
const YM_HEUTE=ymKey(+TODAY.slice(0,4),+TODAY.slice(5,7));
function ymText(ab){ return String(ab%100).padStart(2,'0')+'.'+Math.floor(ab/100); }
function bVer(k,j,m){
  const key=ymKey(j,m), bh=k.bh||[]; let v=null;
  for(let i=0;i<bh.length;i++){ if(bh[i].ab<=key) v=bh[i]; else break; }
  return v;
}
function bVerAkt(k){ return bVer(k,+TODAY.slice(0,4),+TODAY.slice(5,7)) || (k.bh&&k.bh[0]) || null; }
function bMv(v){ if(!v) return 0; const b=+v.budget||0; return v.rhythmus==='J'?b/12:b; }
function bM(k,j,m){ return bMv(bVer(k,j,m)); }
function bJ(k,j){ let s=0; for(let m=1;m<=12;m++) s+=bM(k,j,m); return s; }
function budgetAktiv(k,j,m){ const v=bVer(k,j,m); return !!(v && +v.budget>0); }
function syncAkt(k){ const v=bVerAkt(k); if(v){ k.budget=v.budget; k.rhythmus=v.rhythmus; k.rollover=v.rollover; } }
function updateChip(){
  const c=$('statusChip'); let t,cls;
  if(fileHandle && writeState==='fail'){ t='⚠ Nicht in Datei gespeichert'; cls='bad'; }
  else if(fileHandle){ t='● Datei verbunden'; cls='good'; }
  else if(pendingHandle){ t='⚠ Datei nicht freigegeben'; cls='warn'; }
  else { t='● Nur lokal im Browser'; cls=''; }
  c.textContent=t; c.className='chip '+cls;
}
$('statusChip').onclick = ()=>{ showScreen('mehr'); mehrPane('daten'); };

/* ============================= Migration ============================= */
function migrate(){
  if(!Array.isArray(state.gruppen)) state.gruppen=[];
  if(!Array.isArray(state.serien)) state.serien=[];
  if(!state.einst || typeof state.einst!=='object') state.einst={};
  if(!Array.isArray(state.ziele)) state.ziele=[];
  if(!Array.isArray(state.vorlagen)) state.vorlagen=[];
  if(state.einst) delete state.einst.tdKey;
  if(!state.meta || typeof state.meta!=='object') state.meta={};
  if(!Array.isArray(state.toepfe)) state.toepfe=[];
  // Jahreshistorie frueherer Jahre auf Jahresebene. Steht seit 1.1.1 in der Datei und
  // nicht mehr im Code: eine Datei ohne Historie bekommt leere Faecher, keine fremden Zahlen.
  if(!state.hist || typeof state.hist!=='object') state.hist={};
  ['aus','ein','verm'].forEach(t=>{ if(!state.hist[t] || typeof state.hist[t]!=='object') state.hist[t]={}; });
  delete state.umbau;                       // Marke des Umbau-Assistenten wird nicht mehr gebraucht
  arten();                                   // Standard-Arten anlegen, falls noch keine da
  state.kategorien.forEach(k=>{ if(!k.art) k.art=artVorschlag(k); else artMigrieren(k); });
  state.kategorien.forEach(k=>{ if(k.rollover==null) k.rollover = (k.rhythmus==='J'?100:0); });
  // Bestehende Budgets gelten ab dem Monat der Umstellung – frühere Monate gelten als „ohne Budget“
  state.kategorien.forEach(k=>{
    if(!Array.isArray(k.bh)) k.bh=[{ab:YM_HEUTE,budget:+k.budget||0,rhythmus:k.rhythmus||'M',rollover:+k.rollover||0}];
    k.bh.sort((a,b)=>a.ab-b.ab);
  });
  let fi=0;
  state.gruppen.slice().sort((a,b)=>COLL.compare(a.name,b.name)).forEach(g=>{ if(!g.farbe) g.farbe=PALETTE[fi++%PALETTE.length]; });
  state.kategorien.forEach(k=>{
    if(!k.rhythmus) k.rhythmus='M';
    if(!state.gruppen.some(g=>g.name===k.gruppe)) state.gruppen.push({name:k.gruppe, typ:k.typ});
  });
  state.transaktionen.forEach(t=>{ if(t.titel===undefined){ t.titel=t.notiz||''; t.notiz=''; } });
  state.konten.forEach(a=>{
    if(!a.typ) a.typ='bank';
    if(a.startsaldo===undefined) a.startsaldo=0;
    if(!a.startdatum) a.startdatum='2026-01-01';
    if(!Array.isArray(a.staende)) a.staende=[];
    if(Array.isArray(a.positionen) && a.positionen.length){
      const w=a.positionen.reduce((s,p)=>s+(+p.menge||0)*(+p.kurs||0)*(+p.fx||1),0);
      const d=a.positionen.map(p=>p.kursDatum).filter(Boolean).sort().pop()||TODAY;
      if(w>0 && !a.staende.length) a.staende=[{id:'w'+Date.now()+Math.random(),datum:d,wert:Math.round(w*100)/100}];
      delete a.positionen;
    }
    delete a.positionen;
  });
}

/* ============================= Klicksperre beim Speichern ============================= */
// Ein saveData() dauert auf dem Handy spuerbar lange. Ohne Sperre legt ein zweiter Tipp
// dieselbe Buchung erneut an (die Handler halten ihre Liste fest). Darum: Knopf aus,
// Text "Speichere …", danach zurueck. SPEICHERT sperrt auch alle anderen Knoepfe.
let SPEICHERT=false;
async function einmal(el,fn){
  if(SPEICHERT) return;
  SPEICHERT=true;
  const alt=el?el.textContent:'', altDis=el?el.disabled:false;
  if(el){ el.disabled=true; el.textContent='Speichere …'; }
  try{ return await fn(); }
  finally{ SPEICHERT=false; if(el){ el.disabled=altDis; el.textContent=alt; } }
}
// Legt die Sperre nachtraeglich um einen Knopf, dessen onclick schon gesetzt ist.
function sperre(id){
  const el=$(id); if(!el||el._sperre) return;
  const fn=el.onclick; if(typeof fn!=='function') return;
  el._sperre=true; el.onclick=()=>einmal(el,()=>fn.call(el));
}

/* ============================= Formular sichtbar oeffnen ============================= */
// Bearbeiten fuellte bisher ein Formular, das zugeklappt oder ausserhalb des Bildschirms
// lag. formOeffnen() klappt auf, scrollt hin, betitelt (.formtitel) und laesst aufleuchten.
function formOeffnen(elId,titel){
  const el=$(elId); if(!el) return;
  const d=el.closest('details'); if(d) d.open=true;
  const box=el.closest('.card')||d||el;
  const t=box.querySelector('.formtitel');
  if(t){ if(t._orig===undefined) t._orig=t.textContent; if(titel) t.textContent='Bearbeiten: '+titel; }
  box.scrollIntoView({block:'center'});
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  setTimeout(()=>box.classList.remove('flash'),1200);
}
function formSchliessen(elId){
  const el=$(elId); if(!el) return;
  const box=el.closest('.card')||el.closest('details')||el;
  const t=box.querySelector('.formtitel');
  if(t&&t._orig!==undefined) t.textContent=t._orig;
}

/* ============================= Rueckgaengig nach Loeschen ============================= */
// Die geloeschte Buchung lebt zehn Sekunden in einer Variablen weiter. Kein Feld im
// Datenmodell: nach Ablauf oder Neuladen ist sie weg.
let RUECK=null;
function undoToast(text,fn){
  if(RUECK) clearTimeout(RUECK.timer);
  const box=msgBox();
  box.innerHTML='<div class="msg ok undo"><span>'+esc(text)+'</span>'+
    '<button class="small-btn" data-undo="1">Rückgängig</button></div>';
  const timer=setTimeout(()=>{ if(RUECK&&RUECK.timer===timer){ RUECK=null; box.innerHTML=''; } },10000);
  RUECK={timer};
  box.querySelector('[data-undo]').onclick=async()=>{
    clearTimeout(timer); RUECK=null; box.innerHTML=''; await fn();
  };
}

/* ============================= Rechner im Betragsfeld ============================= */
// Erlaubt "30+10+5.50" oder "90-30-10" direkt im Betragsfeld. Kein eval: ein kleiner
// Parser, der nur Zahlen und + - * / ( ) kennt und sonst null liefert.
function rechne(s){
  if(s===null||s===undefined) return null;
  const t=String(s).replace(/[’'\s ]/g,'').replace(/,/g,'.');
  if(!t) return null;
  if(!/^[0-9.+\-*/()]+$/.test(t)) return null;
  let i=0;
  const expr=()=>{ let v=term(); if(v===null) return null;
    while(t[i]==='+'||t[i]==='-'){ const o=t[i++]; const r=term(); if(r===null) return null; v=o==='+'?v+r:v-r; }
    return v; };
  const term=()=>{ let v=fact(); if(v===null) return null;
    while(t[i]==='*'||t[i]==='/'){ const o=t[i++]; const r=fact(); if(r===null) return null;
      if(o==='/'&&r===0) return null; v=o==='*'?v*r:v/r; }
    return v; };
  const fact=()=>{
    if(t[i]==='('){ i++; const v=expr(); if(v===null||t[i]!==')') return null; i++; return v; }
    if(t[i]==='-'){ i++; const v=fact(); return v===null?null:-v; }
    if(t[i]==='+'){ i++; return fact(); }
    const j=i; while(i<t.length && /[0-9.]/.test(t[i])) i++;
    if(i===j) return null;
    const n=parseFloat(t.slice(j,i));
    return isNaN(n)?null:n; };
  const v=expr();
  if(v===null||i<t.length||!isFinite(v)) return null;
  return Math.round(v*100)/100;
}
// Zeigt unter dem Feld, was gerechnet wurde. Nur wenn es wirklich eine Rechnung ist.
function calcHint(inputId, hintId){
  const el=$(inputId), h=$(hintId); if(!el||!h) return;
  const upd=()=>{
    const raw=el.value.trim();
    const hatOp=/[+\-*/()]/.test(raw.replace(/^-/,''));
    if(!raw||!hatOp){ h.classList.add('hidden'); return; }
    const v=rechne(raw);
    h.classList.remove('hidden');
    if(v===null){ h.className='calc bad'; h.textContent='Rechnung nicht lesbar'; }
    else { h.className='calc'; h.textContent='= '+fmtCHF(v)+' CHF'; }
  };
  el.addEventListener('input',upd);
  el.addEventListener('blur',()=>{ const v=rechne(el.value); if(v!==null && /[+*/]/.test(el.value)){ el.value=String(v); upd(); } });
  el._calcUpd=upd;
}
// A1: Android zeigt bei inputmode="decimal" nur Ziffern, Punkt und Minus; + * / ( ) sind
// nicht eintippbar, rechne() damit auf dem Handy unerreichbar. Die Zeile fuegt die Zeichen
// an der Cursorposition ein.
// Der Fokus muss im Feld bleiben, sonst klappt die Tastatur zu. Darum wird die Vorgabe des
// Knopfdrucks unterdrueckt -- und zwar in `pointerdown`, nicht in `touchstart`: ein
// preventDefault() auf touchstart nimmt dem Browser auch den darauffolgenden `click`, der
// Knopf tat auf dem Handy also gar nichts (Fehler in 1.2.0). pointerdown deckt Maus,
// Finger und Stift ab und feuert vor dem Fokuswechsel, darum liegt die Aktion dort.
function rechnerZeile(inputId){
  const el=$(inputId); if(!el||el._rz) return; el._rz=true;
  const bar=document.createElement('div'); bar.className='calcbar';
  [['+','+'],['−','-'],['×','*'],['÷','/'],['(','('],[')',')'],['⌫','']].forEach(([label,wert])=>{
    const b=document.createElement('button');
    b.type='button'; b.textContent=label; b.tabIndex=-1;
    const tippe=e=>{
      e.preventDefault();
      const a=el.selectionStart==null?el.value.length:el.selectionStart;
      const z=el.selectionEnd==null?a:el.selectionEnd;
      if(wert===''){
        if(a!==z) el.setRangeText('',a,z,'end');
        else if(a>0) el.setRangeText('',a-1,a,'end');
      } else el.setRangeText(wert,a,z,'end');
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.focus();
    };
    if(window.PointerEvent) b.addEventListener('pointerdown',tippe);
    else { b.addEventListener('touchstart',tippe,{passive:false}); b.addEventListener('mousedown',tippe); }
    bar.appendChild(b);
  });
  el.parentNode.insertBefore(bar,el.nextSibling);
  el.addEventListener('focus',()=>bar.classList.add('an'));
  el.addEventListener('blur',()=>setTimeout(()=>{ if(document.activeElement!==el) bar.classList.remove('an'); },150));
}

/* ============================= Buchungs-Logik ============================= */
// Übertrag ohne Kategorie ist budgetneutral; mit Kategorie zählt er nach deren Typ.
// Ein Übertrag mit Kategorie zählt nach deren Typ. Mit "gegen" zählt er negativ:
// Geld, das aus dieser Kategorie zurückkommt, etwa wenn du vom Sparkonto aufs
// Lohnkonto zurückschichtest, um von dort weiter zu investieren.
function eff(t){
  const k=katById(t.kategorieId);
  if(t.typ==='Übertrag') return k?{typ:k.typ,k,vz:t.gegen?-1:1}:{typ:null,k:null,vz:1};
  return {typ:t.typ,k,vz:1};
}
// Ist-Werte: nur Buchungen bis heute. Zukunft wird separat als Prognose behandelt.
// Index: typ|jahr|monat|kategorieId -> Betrag. Einmal pro Render, sonst wird
// jede Budgetzeile zu einem vollen Durchlauf durch alle Buchungen.
let AGG=null, AGGJ={}, AGGE=null, KATNAME=null;
function aggInvalidate(){ AGG=null; AGGE=null; KATNAME=null; }
function agg(){
  if(AGG) return AGG;
  AGG={}; AGGJ={}; AGGE={};
  state.transaktionen.forEach(t=>{
    if(t.datum>TODAY) return;
    AGGJ[t.datum.slice(0,4)]=true;
    const e=eff(t); if(!e.k) return;
    const key=e.typ+'|'+t.datum.slice(0,4)+'|'+(+t.datum.slice(5,7))+'|'+e.k.id;
    const wert=t.betrag*(e.vz||1);
    AGG[key]=(AGG[key]||0)+wert;
    if(wert<0) AGGE[key]=(AGGE[key]||0)-wert;
  });
  return AGG;
}
function katByName(n){
  if(!KATNAME){ KATNAME={}; state.kategorien.forEach(k=>KATNAME[k.kategorie]=k); }
  return KATNAME[n];
}
function liveSum(typ, jahr, monat, gruppe, kategorieName, bisMonat){
  const a=agg();
  let kats;
  if(kategorieName){ const k=katByName(kategorieName); if(!k) return 0; kats=[k]; }
  else if(gruppe) kats=state.kategorien.filter(k=>k.gruppe===gruppe);
  else kats=state.kategorien;
  const von=monat||1, bis=monat||bisMonat||12;
  let s=0;
  for(const k of kats) for(let m=von;m<=bis;m++) s+=a[typ+'|'+jahr+'|'+m+'|'+k.id]||0;
  return s;
}
// Summe über mehrere Kategorien. Eine Rückerstattung senkt nur die Ausgaben ihrer
// eigenen Kategorie. Bleibt in einer Kategorie netto Geld übrig (Erstattung ohne
// passende Ausgabe im Zeitraum), wird dieser Rest separat als "ueber" ausgewiesen,
// statt stillschweigend die Ausgaben fremder Kategorien zu senken.
function ausSplit(jahr, monat, bisMonat, gruppe){
  const a=agg();
  const kats=gruppe?state.kategorien.filter(k=>k.gruppe===gruppe):state.kategorien;
  const von=monat||1, bis=monat||bisMonat||12;
  let aus=0, ueber=0;
  for(const k of kats){
    if(k.typ==='Ausgabe' && !istKonsum(k)) continue;   // Sparen und Gebundenes sind kein Konsum
    let s=0;
    for(let m=von;m<=bis;m++) s+=a['Ausgabe|'+jahr+'|'+m+'|'+k.id]||0;
    if(s>=0) aus+=s; else ueber-=s;
  }
  return {aus,ueber};
}
// Übertrag läuft über Jahresgrenzen weiter, ab dem ersten Budgetmonat der Kategorie.
// Monate ohne Budget (Version fehlt oder Budget 0) übertragen nichts: sonst würde
// z. B. eine Kaution ohne Budget für immer als Überzug mitgeschleppt.
let ROLLC=null;
function rollAt(k,j,m){
  if(!ROLLC) ROLLC={};
  const c=ROLLC[k.id]||(ROLLC[k.id]={});
  const key=ymKey(j,m);
  if(c[key]) return c[key];
  // Erstattung senkt nur die eigene Kategorie: was netto übrig bleibt, landet in
  // "ueber" und schreibt weder dem Budget noch einer anderen Kategorie etwas gut.
  const roh=liveSum('Ausgabe',j,m,null,k.kategorie);
  const ist=Math.max(0,roh), ueber=roh<0?-roh:0;
  const first=(k.bh&&k.bh.length)?Math.max(201901,k.bh[0].ab):null;
  if(first===null||key<first) return c[key]={verf:0,ist,ueber,rest:0,roll:0,gespart:0,next:0,aktiv:false};
  let roll=0;
  if(key>first){ const pj=m===1?j-1:j, pm=m===1?12:m-1; roll=rollAt(k,pj,pm).next; }
  const v=bVer(k,j,m), b=bMv(v), p=(v?(+v.rollover||0):0)/100;
  if(!(b>0)) return c[key]={verf:0,ist,ueber,rest:0,roll:0,gespart:0,next:0,aktiv:false};
  const verf=b+roll, rest=verf-ist;
  const next=rest>=0?rest*p:rest, gespart=rest>=0?rest*(1-p):0;
  return c[key]={verf,ist,ueber,rest,roll,gespart,next,aktiv:true};
}
function budgetMonat(kats,j,m){
  const r={verf:0,ist:0,roll:0,gespart:0,ohne:0,ueber:0,n:0};
  kats.forEach(k=>{ const x=rollAt(k,j,m); r.ueber+=x.ueber;
    if(x.aktiv){ r.verf+=x.verf; r.ist+=x.ist; r.roll+=x.roll; r.gespart+=x.gespart; r.n++; } else r.ohne+=x.ist; });
  return r;
}
// Jahresvergleich nur über Monate, für die ein Budget galt
function budgetJahr(kats,j,bis){
  let bud=0, istB=0, ueberB=0, mTot=0, mBis=0;
  const aktivMonat=Array(13).fill(false);
  kats.forEach(k=>{ let s=0;
    for(let m=1;m<=12;m++){ if(!budgetAktiv(k,j,m)) continue;
      aktivMonat[m]=true; bud+=bM(k,j,m); if(m<=bis) s+=liveSum('Ausgabe',j,m,null,k.kategorie); }
    if(s>=0) istB+=s; else ueberB-=s; });
  for(let m=1;m<=12;m++) if(aktivMonat[m]){ mTot++; if(m<=bis) mBis++; }
  return {bud, istB, ueberB, pace: mTot? mBis/mTot : 0, ersterMonat: aktivMonat.indexOf(true)};
}
function hatLive(j){ agg(); return !!AGGJ[j]; }
function jahrTotal(typ, jahr){
  if(jahr<2026 && !hatLive(jahr)){ const src=typ==='Ausgabe'?state.hist.aus[jahr]:state.hist.ein[jahr]; return src?Object.values(src).reduce((a,b)=>a+b,0):0; }
  return typ==='Ausgabe'?ausSplit(jahr).aus:liveSum(typ, jahr);
}
function istKat(k,jahr,bisMonat){
  if(jahr<2026 && !hatLive(jahr)) return (state.hist.aus[jahr]||{})[k.kategorie]||0;
  return liveSum('Ausgabe',jahr,null,null,k.kategorie,bisMonat);
}
/* ---------- Farben und Sortierung ---------- */
const PALETTE=['#4C78A8','#E07A5F','#3D9970','#E3A21A','#9C6ADE','#2CA7A0','#D65DB1','#8D6E63','#5B8DEF','#C0504D','#7FB800','#FF8C42','#6C757D','#17A2B8'];
const COLL=new Intl.Collator('de-CH',{sensitivity:'base'});
function gFarbe(name){ const g=state.gruppen.find(g=>g.name===name); return (g&&g.farbe)||'#888888'; }
// Lange Kategorienamen dürfen an / und - umbrechen, aber nicht mitten im Wort.
function brechbar(s){ return esc(s).replace(/([\/\-])/g,'$1<wbr>'); }
function dot(c){ return '<i class="dot" style="background:'+esc(c)+'"></i>'; }
function gruppenSort(typ){
  return state.gruppen.filter(g=>!typ||g.typ===typ).slice()
    .sort((a,b)=>(a.typ===b.typ?0:(a.typ==='Ausgabe'?-1:1))||COLL.compare(a.name,b.name));
}
function katsSort(gruppe,typ){
  return state.kategorien.filter(k=>(!gruppe||k.gruppe===gruppe)&&(!typ||k.typ===typ)).slice()
    .sort((a,b)=>COLL.compare(a.kategorie,b.kategorie));
}

/* ============================= Serien (Abos / Daueraufträge) ============================= */
function serieTermin(s,k){
  const n=(+s.n||1)*k;
  if(s.einheit==='T') return addDays(s.start,n);
  if(s.einheit==='W') return addDays(s.start,n*7);
  return addMonths(s.start, s.einheit==='J'? n*12 : n);
}
function serieTermine(s, von, bis){
  const out=[];
  for(let k=0;k<3000;k++){
    const d=serieTermin(s,k);
    if(s.ende && d>s.ende) break;
    if(d>bis) break;
    if(d>=von) out.push(d);
  }
  return out;
}
function serieMonatsBetrag(s){
  const n=+s.n||1;
  if(s.einheit==='T') return s.betrag*30.44/n;
  if(s.einheit==='W') return s.betrag*52.18/12/n;
  if(s.einheit==='J') return s.betrag/(12*n);
  return s.betrag/n;
}
function naechsterTermin(s){
  const t=serieTermine(s, TODAY, addDays(TODAY,3650)).filter(d=>!terminErledigt(s,d));
  return t.length?t[0]:null;
}
// Fällig = Termin <= heute, der noch keine Buchung hat
// Ein Termin gilt als erledigt, wenn eine Buchung auf diesem Datum liegt oder
// eine Buchung diesen Termin ausdrücklich abdeckt (serieTermin, nach dem Anpassen).
function terminErledigt(s,d){
  if((s.skip||[]).includes(d)) return true;
  return state.transaktionen.some(t=>t.serieId===s.id && (t.datum===d || t.serieTermin===d));
}
function faellige(){
  const out=[];
  state.serien.filter(s=>s.aktiv!==false).forEach(s=>{
    const ab = s.letzte ? addDays(s.letzte,1) : s.start;
    serieTermine(s, ab, TODAY).forEach(d=>{
      if(terminErledigt(s,d)) return;
      out.push({serie:s, datum:d});
    });
  });
  return out.sort((a,b)=>a.datum.localeCompare(b.datum));
}
function buchungAusSerie(s,d){
  const o={id:'t'+Date.now()+Math.random(), datum:d, konto:s.konto, kategorieId:s.kategorieId||null,
    typ:s.typ, betrag:s.betrag, titel:s.titel, notiz:'', serieId:s.id, serieTermin:d};
  if(s.topfId) o.topfId=s.topfId;
  if(s.gegen) o.gegen=true;
  if(s.typ==='Übertrag') o.kontoNach=s.kontoNach;
  return o;
}
async function verbuchen(liste){
  if(!liste.length) return 0;
  liste.forEach(f=>{
    state.transaktionen.push(buchungAusSerie(f.serie,f.datum));
    if(!f.serie.letzte || f.datum>f.serie.letzte) f.serie.letzte=f.datum;
  });
  await saveData(); renderAll();
  return liste.length;
}
async function autoVerbuchen(){
  const auto=faellige().filter(f=>f.serie.auto!==false);
  if(!auto.length) return;
  const n=await verbuchen(auto);
  showMsg('ok', n+' fällige Buchung(en) aus Daueraufträgen erstellt.');
}
// Virtuelle Zukunftstermine der Serien (werden nie gespeichert)
function geplanteSerien(von,bis){
  const out=[];
  state.serien.filter(s=>s.aktiv!==false).forEach(s=>{
    serieTermine(s, von, bis).forEach(d=>{
      if(terminErledigt(s,d)) return;
      out.push({datum:d, typ:s.typ, betrag:s.betrag, konto:s.konto, kontoNach:s.kontoNach, gegen:s.gegen,
        kategorieId:s.kategorieId, titel:s.titel, serie:true});
    });
  });
  return out;
}
function geplantAlle(von,bis){
  const fix=state.transaktionen.filter(t=>t.datum>=von && t.datum<=bis).map(t=>({...t,serie:false}));
  return [...fix, ...geplanteSerien(von,bis)].sort((a,b)=>a.datum.localeCompare(b.datum));
}

/* ============================= Konten ============================= */
function flussZw(a, von, bis){
  let s=0;
  state.transaktionen.forEach(t=>{
    if(t.datum>bis || t.datum<von) return;
    if(t.konto===a.name) s += (t.typ==='Einnahme'? t.betrag : -t.betrag);
    if(t.typ==='Übertrag' && t.kontoNach===a.name) s += t.betrag;
  });
  return s;
}
function staende(a){ return (a.staende||[]).slice().sort((x,y)=>x.datum.localeCompare(y.datum)); }
function letzterStand(a, bis){ const s=staende(a).filter(s=>s.datum<=(bis||TODAY)); return s.length?s[s.length-1]:null; }
// Einstand = was netto hineingeflossen ist. Ziehst du Geld ab, sinkt er mit, der Gewinn bleibt.
function kontoEinstand(a, bis){ return (+a.startsaldo||0) + flussZw(a, a.startdatum||'0000-00-00', bis||TODAY); }
function kontoWert(a, bis){
  bis = bis||TODAY;
  if(a.typ!=='anlage') return (+a.startsaldo||0) + flussZw(a, a.startdatum||'0000-00-00', bis);
  const st=letzterStand(a,bis);
  if(!st) return kontoEinstand(a,bis);
  return (+st.wert||0) + flussZw(a, addDays(st.datum,1), bis);
}
function kontoGV(a, bis){ return a.typ==='anlage' && letzterStand(a,bis) ? kontoWert(a,bis)-kontoEinstand(a,bis) : null; }
function kontoPrognose(a, bis){
  let v=kontoWert(a,bis);
  geplanteSerien(addDays(TODAY,1),bis).forEach(g=>{
    if(g.konto===a.name) v += (g.typ==='Einnahme'? g.betrag : -g.betrag);
    if(g.typ==='Übertrag' && g.kontoNach===a.name) v += g.betrag;
  });
  return v;
}
function vermoegenHeute(){ return state.konten.reduce((s,a)=>s+kontoWert(a),0); }
function vermoegenPrognose(bis){ return state.konten.reduce((s,a)=>s+kontoPrognose(a,bis),0); }
function kontenLeer(){ return state.konten.every(a=>!(+a.startsaldo) && !(a.staende||[]).length) && !state.transaktionen.length; }
function vermTotal(v){ return v.total!=null ? v.total : (v.lohn+v.spar+v.anl+v.kry+v.son); }
function vermoegenAnzeige(){
  if(!kontenLeer()) return vermoegenHeute();
  if(state.vermoegen.length) return vermTotal(state.vermoegen.slice().sort((a,b)=>a.datum.localeCompare(b.datum)).slice(-1)[0]);
  const hj=Object.keys(state.hist.verm).sort();
  return hj.length?vermTotal(state.hist.verm[hj[hj.length-1]]):0;
}

/* ============================= Navigation ============================= */
function showScreen(name){
  qsa('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.screen===name));
  qsa('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+name));
  window.scrollTo(0,0); renderAll();
}
$('tabs').addEventListener('click', e=>{ const b=e.target.closest('button[data-screen]'); if(b) showScreen(b.dataset.screen); });

/* ============================= Gruppen-/Kategorie-Selects ============================= */
function fillGK(pre, mode){
  const gsel=$(pre+'Gruppe'), ksel=$(pre+'Kategorie'), ueb = mode==='Übertrag';
  const pg=gsel.value, pk=ksel.value;
  const gs=gruppenSort(ueb?null:mode).map(g=>g.name);
  gsel.innerHTML=(ueb?'<option value="">— keine —</option>':'')+gs.map(g=>'<option>'+esc(g)+'</option>').join('');
  if(gs.includes(pg)||(ueb&&pg==='')) gsel.value=pg;
  const g=gsel.value;
  const ks=g?katsSort(g,ueb?null:mode):[];
  ksel.innerHTML=(ueb?'<option value="">— keine —</option>':'')+ks.map(k=>'<option value="'+esc(k.id)+'">'+esc(k.kategorie)+'</option>').join('');
  if([...ksel.options].some(o=>o.value===pk)) ksel.value=pk;
}
function fillKontoSelects(){
  const opts=state.konten.map(a=>'<option>'+esc(a.name)+'</option>').join('');
  ['txKonto','txKontoNach','serKonto','serKontoNach'].forEach(id=>{
    const sel=$(id), prev=sel.value;
    sel.innerHTML = opts;
    if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
    else if(/Nach$/.test(id) && state.konten[1]) sel.value=state.konten[1].name;
  });
}

/* ============================= Erfassen ============================= */
let mode='Ausgabe', txLimit=20;
$('modeSeg').addEventListener('click', e=>{ const b=e.target.closest('button[data-mode]'); if(b) setMode(b.dataset.mode); });
function setMode(m){
  mode=m;
  qsa('#modeSeg button').forEach(b=>b.classList.toggle('on', b.dataset.mode===m));
  const ueb=m==='Übertrag';
  $('rowNach').classList.toggle('hidden',!ueb);
  $('uebHint').classList.toggle('hidden',!ueb);
  $('lblKonto').textContent=ueb?'Von Konto':'Konto';
  $('lblGruppe').textContent=ueb?'Gruppe (optional)':'Gruppe';
  $('lblKat').textContent=ueb?'Kategorie (optional)':'Kategorie';
  $('rowRueck').classList.remove('hidden');
  $('lblRueck').textContent = ueb
    ? 'Gegenbuchung: holt Geld aus der gewählten Kategorie zurück, statt neues hineinzulegen'
    : m==='Einnahme'
    ? 'Rückzahlung: Geld aus dieser Kategorie, das ich zurückgeben musste'
    : 'Rückerstattung: Geld, das ich für diese Ausgabe zurückbekomme';
  fillGK('tx',mode);
  topfSelectTx();
}
function topfSelectTx(){ fillTopfSelect('txTopf', mode, $('txKonto').value, $('txKontoNach').value); }
$('txGruppe').onchange = ()=>fillGK('tx',mode);
$('txKonto').onchange = topfSelectTx;
$('txKontoNach').onchange = topfSelectTx;
$('txDatum').onchange = pruefeDatum;
function pruefeDatum(){
  const d=$('txDatum').value, zu=d&&d>TODAY;
  $('futureHint').classList.toggle('hidden',!zu);
  if(zu) $('futureHint').innerHTML='<span class="planc">Liegt in der Zukunft: zählt erst ab '+fmtDatum(d)+', erscheint bis dahin nur in der Prognose.</span>';
}
function resetForm(){
  editingTxId=null; anpassTermin=null; $('formTitle').textContent='Buchung erfassen';
  $('btnCancelEdit').classList.add('hidden');
  $('txBetrag').value=''; $('txTitel').value=''; $('txNotiz').value=''; $('txTags').value=''; $('txRueck').checked=false;
  $('splitBox').innerHTML=''; splitN=0;
  $('txCalc').classList.add('hidden'); $('splitInfo').classList.add('hidden'); $('splitHilfe').classList.add('hidden');
  if($('txTopf')) $('txTopf').value='';
}
let splitN=0;
let anpassTermin=null;
function splitZeilen(){
  return [...document.querySelectorAll('#splitBox .splitrow')].map(r=>({
    kategorieId:r.querySelector('select').value,
    betrag:rechne(r.querySelector('input').value)||0
  })).filter(x=>x.kategorieId && x.betrag>0);
}
// "Rest": Gesamtbetrag im Hauptfeld minus alle anderen Teilbetraege.
// Der Rest landet in der Zeile, deren Knopf gedrueckt wurde.
function splitRest(ziel){
  const total=rechne($('txBetrag').value);
  if(total===null||!total){ showMsg('err','Zuerst den Gesamtbetrag oben eintragen.'); return; }
  let andere=0;
  document.querySelectorAll('#splitBox .splitrow').forEach(r=>{
    if(r===ziel) return;
    andere+=rechne(r.querySelector('input').value)||0;
  });
  const rest=Math.round((Math.abs(total)-andere)*100)/100;
  if(rest<=0){ showMsg('err','Kein Rest übrig: die Teilbeträge erreichen schon '+fmtCHF(andere)+'.'); return; }
  const inp=ziel.querySelector('input');
  inp.value=String(rest); if(inp._calcUpd) inp._calcUpd();
  splitSumme();
}
// Laufende Kontrolle: Hauptbetrag ist der Rest, der nach den Teilzeilen bleibt.
function splitSumme(){
  const box=$('splitBox'), info=$('splitInfo');
  if(!info) return;
  const rows=document.querySelectorAll('#splitBox .splitrow');
  if(!rows.length){ info.classList.add('hidden'); return; }
  const total=rechne($('txBetrag').value);
  const teil=splitZeilen().reduce((s,x)=>s+x.betrag,0);
  info.classList.remove('hidden');
  if(total===null||!total){ info.className='calc bad'; info.textContent='Gesamtbetrag oben fehlt.'; return; }
  const rest=Math.round((Math.abs(total)-teil)*100)/100;
  if(rest<0){ info.className='calc bad';
    info.textContent='Teilbeträge ('+fmtCHF(teil)+') übersteigen den Gesamtbetrag ('+fmtCHF(Math.abs(total))+').'; }
  else { info.className='calc';
    info.textContent=fmtCHF(Math.abs(total))+' total = '+fmtCHF(rest)+' auf die Hauptkategorie + '+fmtCHF(teil)+' aufgeteilt'; }
}
$('btnSplit').onclick=()=>{
  if(mode==='Übertrag'){ showMsg('err','Aufteilen geht nur bei Ausgaben und Einnahmen.'); return; }
  splitN++;
  const d=document.createElement('div');
  d.className='splitrow grid2';
  d.innerHTML='<div class="field"><label>Weitere Kategorie</label><select></select></div>'+
    '<div class="field"><label>Betrag</label><div class="btnrow" style="flex-wrap:nowrap">'+
    '<input type="text" inputmode="decimal" autocomplete="off" style="flex:1;min-width:0;padding:10px;min-height:44px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text)">'+
    '<button class="small-btn" type="button" data-rest="1" title="Restbetrag einsetzen">Rest</button>'+
    '<button class="small-btn danger" type="button" data-del="1">✕</button></div></div>';
  d.querySelector('select').innerHTML=gruppenSort(mode).flatMap(g=>katsSort(g.name,mode))
    .map(k=>'<option value="'+esc(k.id)+'">'+esc(k.gruppe)+' · '+esc(k.kategorie)+'</option>').join('');
  d.querySelector('[data-del]').onclick=()=>{ d.remove(); splitSumme(); };
  d.querySelector('[data-rest]').onclick=()=>splitRest(d);
  d.querySelector('input').addEventListener('input',splitSumme);
  d.querySelector('select').addEventListener('change',splitSumme);
  $('splitBox').appendChild(d);
  $('splitHilfe').classList.remove('hidden');
  splitSumme();
};
$('btnSaveTx').onclick = async ()=>{
  const datum=$('txDatum').value;
  let betrag=rechne($('txBetrag').value);
  if(betrag===null){ showMsg('err','Betrag nicht lesbar. Erlaubt sind Zahlen und + - * / ( ).'); return; }
  const gegen = mode==='Übertrag' && $('txRueck').checked;
  if(mode!=='Übertrag' && $('txRueck').checked) betrag=-Math.abs(betrag);
  const titel=$('txTitel').value.trim(), notiz=$('txNotiz').value.trim();
  const konto=$('txKonto').value, nach=$('txKontoNach').value, kategorieId=$('txKategorie').value;
  if(!datum||!isFinite(betrag)||betrag===0){ showMsg('err','Datum und Betrag ausfüllen.'); return; }
  if(mode==='Übertrag'){
    if(betrag<0){ showMsg('err','Betrag beim Übertrag positiv eingeben.'); return; }
    if(konto===nach){ showMsg('err','Von- und Nach-Konto müssen verschieden sein.'); return; }
  } else if(!kategorieId){ showMsg('err','Kategorie wählen (ggf. unter „Mehr“ anlegen).'); return; }
  const tags=$('txTags').value.split(',').map(s=>s.trim()).filter(Boolean);
  const o={datum,konto,kategorieId:kategorieId||null,typ:mode,betrag,titel,notiz,tags};
  if(mode==='Übertrag') o.kontoNach=nach;
  const topf=$('txTopf').value; if(topf) o.topfId=topf;
  if(gegen) o.gegen=true;
  // Aus einer fälligen Serie angepasst: Herkunft und abgedeckten Termin festhalten.
  if(anpassTermin && !editingTxId){
    o.serieId=anpassTermin.serieId; o.serieTermin=anpassTermin.datum;
    const s=state.serien.find(x=>x.id===anpassTermin.serieId);
    if(s && (!s.letzte || anpassTermin.datum>s.letzte)) s.letzte=anpassTermin.datum;
  }
  if(editingTxId){ const t=state.transaktionen.find(t=>t.id===editingTxId); delete t.kontoNach; delete t.topfId; delete t.gegen; Object.assign(t,o); }
  else {
    const extra=splitZeilen();
    if(extra.length){
      // Der Betrag oben ist der Gesamtbetrag des Belegs. Die Teilzeilen werden davon
      // abgezogen, der Rest bleibt auf der Hauptkategorie.
      const vz=betrag<0?-1:1, total=Math.abs(betrag);
      const teil=extra.reduce((s,x)=>s+x.betrag,0);
      const rest=Math.round((total-teil)*100)/100;
      if(rest<-0.004){
        showMsg('err','Die Teilbeträge ('+fmtCHF(teil)+') übersteigen den Gesamtbetrag ('+fmtCHF(total)+').'); return; }
      const sid='sp'+Date.now();
      let n=0;
      if(rest>0.004){ state.transaktionen.push(Object.assign({id:'t'+Date.now()+Math.random(),splitId:sid},o,{betrag:rest*vz})); n++; }
      extra.forEach((x,i)=>{ state.transaktionen.push(Object.assign({},o,
        {id:'t'+Date.now()+Math.random()+'x'+i,splitId:sid,kategorieId:x.kategorieId,betrag:x.betrag*vz})); n++; });
      resetForm(); await saveData(); renderAll();
      showMsg('ok','Beleg über '+fmtCHF(total)+' auf '+n+' Kategorien aufgeteilt.');
      return;
    }
    state.transaktionen.push(Object.assign({id:'t'+Date.now()+Math.random()},o));
  }
  const zu=datum>TODAY;
  resetForm(); await saveData(); renderAll();
  showMsg('ok', zu?'Gespeichert – geplant für '+fmtDatum(datum)+'.':'Gespeichert.');
};
$('btnCancelEdit').onclick = resetForm;
$('btnMoreTx').onclick = ()=>{ txLimit+=30; renderRecentTx(); };
function txTitel(t){ const k=katById(t.kategorieId); return t.titel || (t.typ==='Übertrag'?'Übertrag':(k?k.kategorie:'(ohne Titel)')); }
function txZeile(t,extra){
  // Farbe sagt etwas aus: Grün ist Geld herein, Violett ist noch nicht gebucht.
  // Normale Ausgaben bleiben neutral – sonst leuchtet ein Haushaltsbuch dauernd rot.
  const k=katById(t.kategorieId); let amt,cls=''; const b=+t.betrag, rueck=b<0&&t.typ!=='Übertrag';
  if(t.typ==='Einnahme'){ amt=(b<0?'−':'+')+fmtCHF(Math.abs(b)); cls=b<0?'':'pos'; }
  else if(t.typ==='Ausgabe'){ amt=(b<0?'+':'−')+fmtCHF(Math.abs(b)); cls=b<0?'pos':''; }
  else { amt=fmtCHF(b); cls='dim'; }
  if(t.datum>TODAY) cls='planc';
  const sub=fmtDatum(t.datum)+' · '+(t.typ==='Übertrag'
    ? esc(t.konto)+' → '+esc(t.kontoNach||'?')+(k?' · '+esc(k.kategorie):'')
    : esc(k?k.kategorie:'?')+' · '+esc(t.konto));
  const tags=(t.datum>TODAY?'<span class="tag">geplant</span>':'')+((t.serieId||t.serie)?'<span class="tag rep">Abo</span>':'')+
    (t.splitId?'<span class="tag rep">geteilt</span>':'')+(rueck?'<span class="tag rep">Rückerstattung</span>':'')+(t.gegen?'<span class="tag rep">Gegenbuchung</span>':'')+(t.tags||[]).map(x=>'<span class="tag rep">#'+esc(x)+'</span>').join('');
  return '<div class="tx"'+(t.id?' data-id="'+esc(t.id)+'"':'')+' style="border-left-color:'+(k?esc(gFarbe(k.gruppe)):'transparent')+'"><div class="l"><div class="tx-t">'+esc(txTitel(t))+tags+'</div>'+
    '<div class="tx-s">'+sub+'</div>'+(t.notiz?'<div class="tx-s">'+esc(t.notiz)+'</div>':'')+(extra||'')+
    '</div><div class="tx-a '+cls+'">'+amt+'</div></div>';
}
const WTAG=['So','Mo','Di','Mi','Do','Fr','Sa'];
let listeModus='gebucht';
$('listeSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-l]'); if(!b) return;
  listeModus=b.dataset.l; qsa('#listeSeg button').forEach(x=>x.classList.toggle('on',x.dataset.l===listeModus));
  txLimit=20; renderRecentTx(); });
function renderRecentTx(){
  const q=($('txSuche').value||'').trim().toLowerCase();
  const fk=$('filterKat').value, fa=$('filterKonto').value;
  const fj=$('filterJahr').value, fm=$('filterMonat').value;
  let all;
  if(listeModus==='geplant'){
    all=[...state.transaktionen.filter(t=>t.datum>TODAY), ...geplanteSerien(addDays(TODAY,1),addDays(TODAY,365))]
      .sort((a,b)=>a.datum.localeCompare(b.datum));
  } else {
    all=state.transaktionen.filter(t=>listeModus==='alle'||t.datum<=TODAY)
      .sort((a,b)=>b.datum.localeCompare(a.datum)||String(b.id).localeCompare(String(a.id)));
  }
  const filtern=q||fk||fa||fj||fm;
  if(filtern) all=all.filter(t=>{
    const k=katById(t.kategorieId);
    if(fj && t.datum.slice(0,4)!==fj) return false;
    if(fm && t.datum.slice(5,7)!==fm) return false;
    if(fk && t.kategorieId!==fk) return false;
    if(fa && t.konto!==fa && t.kontoNach!==fa) return false;
    if(!q) return true;
    return [t.titel,t.notiz,t.konto,t.kontoNach,k&&k.kategorie,k&&k.gruppe,(t.tags||[]).join(' '),String(t.betrag),fmtDatum(t.datum)]
      .some(v=>v&&String(v).toLowerCase().includes(q));
  });
  const wirkung=t=>t.typ==='Einnahme'?+t.betrag:(t.typ==='Ausgabe'?-t.betrag:0);
  // Aktive Filter im Kopf der eingeklappten Karte anzeigen
  const aktiv=[q&&'Suche',fj&&fj,fm&&MONATE[+fm-1],fk&&(katById(fk)||{}).kategorie,fa].filter(Boolean);
  $('filterAktiv').textContent=aktiv.length?aktiv.join(' · '):'';
  $('sucheInfo').classList.toggle('hidden',!filtern&&listeModus==='gebucht');
  if(!$('sucheInfo').classList.contains('hidden')){
    const ein=all.filter(t=>t.typ==='Einnahme').reduce((s,t)=>s+ +t.betrag,0);
    const aus=all.filter(t=>t.typ==='Ausgabe').reduce((s,t)=>s+ +t.betrag,0);
    $('sucheInfo').textContent=all.length+' Buchungen · +'+fmt0(ein)+' / −'+fmt0(aus)+' = '+fmt0(ein-aus);
  }
  const zeigen=all.slice(0,txLimit);
  let html='', tag=null, erste=true;
  zeigen.forEach(t=>{
    if(t.datum!==tag){
      tag=t.datum;
      const s=all.filter(x=>x.datum===tag).reduce((s,x)=>s+wirkung(x),0);
      const d=new Date(tag+'T12:00:00');
      html+='<div class="tagkopf'+(erste?' first':'')+'"><span>'+WTAG[d.getDay()]+', '+fmtDatum(tag)+'</span>'+
        '<span class="num '+(s>0?'pos':'dim')+'">'+(s>0?'+':'')+fmtCHF(s)+'</span></div>';
      erste=false;
    }
    html+=txZeile(t);
  });
  $('recentTx').innerHTML=html||'<p class="small">'+(listeModus==='geplant'?'Nichts geplant.':'Keine Buchungen gefunden.')+'</p>';
  $('btnMoreTx').classList.toggle('hidden', all.length<=txLimit);
  qsa('#recentTx .tx[data-id]').forEach(el=>el.onclick=()=>openTx(el.dataset.id));
}
['txSuche'].forEach(id=>$(id).oninput=()=>{ txLimit=20; renderRecentTx(); });
['filterKat','filterKonto','filterJahr','filterMonat'].forEach(id=>$(id).onchange=()=>{ txLimit=20; renderRecentTx(); });
$('btnFilterReset').onclick=()=>{ ['txSuche','filterKat','filterKonto','filterJahr','filterMonat'].forEach(i=>$(i).value=''); txLimit=20; renderRecentTx(); };
function fillFilter(){
  const fk=$('filterKat'), fa=$('filterKonto'), pk=fk.value, pa=fa.value;
  fk.innerHTML='<option value="">alle Kategorien</option>'+gruppenSort().map(g=>
    '<optgroup label="'+esc(g.name)+'">'+katsSort(g.name)
      .map(k=>'<option value="'+esc(k.id)+'">'+esc(k.kategorie)+'</option>').join('')+'</optgroup>').join('');
  fa.innerHTML='<option value="">alle Konten</option>'+state.konten.map(a=>'<option>'+esc(a.name)+'</option>').join('');
  fk.value=pk; fa.value=pa;
  const fj=$('filterJahr'), pj=fj.value;
  const jahre=[...new Set(state.transaktionen.map(t=>t.datum.slice(0,4)))].sort().reverse();
  fj.innerHTML='<option value="">alle Jahre</option>'+jahre.map(j=>'<option>'+j+'</option>').join('');
  if(jahre.includes(pj)) fj.value=pj;
  if(!$('filterMonat').options.length)
    $('filterMonat').innerHTML='<option value="">alle Monate</option>'+MONATE.map((n,i)=>'<option value="'+String(i+1).padStart(2,'0')+'">'+n+'</option>').join('');
}
/* --- Vorlagen --- */
function renderVorlagen(){
  $('vorlagenBox').innerHTML=state.vorlagen.length
    ? state.vorlagen.map(v=>'<span class="pill" style="cursor:pointer" data-vl="'+esc(v.id)+'">'+esc(v.name)+
        ' <a data-vx="'+esc(v.id)+'" style="padding:0 4px;opacity:.6">✕</a></span>').join('')
    : '<p class="small">Noch keine Vorlagen. Formular ausfüllen und auf „Als Vorlage“ tippen.</p>';
  qsa('#vorlagenBox [data-vl]').forEach(el=>el.onclick=e=>{ if(e.target.dataset.vx) return; vorlageAnwenden(el.dataset.vl); });
  qsa('#vorlagenBox [data-vx]').forEach(el=>el.onclick=async e=>{ e.stopPropagation();
    if(!confirm('Vorlage löschen?')) return;
    state.vorlagen=state.vorlagen.filter(v=>v.id!==el.dataset.vx); await saveData(); renderAll(); });
}
function vorlageAnwenden(id){
  const v=state.vorlagen.find(v=>v.id===id); if(!v) return;
  setMode(v.typ);
  const k=katById(v.kategorieId);
  if(k){ $('txGruppe').value=k.gruppe; fillGK('tx',mode); $('txKategorie').value=v.kategorieId; }
  if(v.konto) $('txKonto').value=v.konto;
  if(v.kontoNach) $('txKontoNach').value=v.kontoNach;
  $('txRueck').checked=(+v.betrag<0); $('txBetrag').value=v.betrag?Math.abs(v.betrag):''; $('txTitel').value=v.titel||''; $('txNotiz').value=v.notiz||'';
  $('txTags').value=(v.tags||[]).join(', ');
  $('txDatum').value=TODAY; pruefeDatum();
  showMsg('ok','Vorlage „'+v.name+'“ übernommen.');
}
$('btnAlsVorlage').onclick=async()=>{
  const titel=$('txTitel').value.trim();
  const name=(prompt('Name der Vorlage:', titel||'Neue Vorlage')||'').trim();
  if(!name) return;
  const v={id:'vl'+Date.now(),name,typ:mode,kategorieId:$('txKategorie').value||null,konto:$('txKonto').value,
    betrag:parseFloat($('txBetrag').value)||0,titel,notiz:$('txNotiz').value.trim(),
    tags:$('txTags').value.split(',').map(s=>s.trim()).filter(Boolean)};
  if(mode==='Übertrag') v.kontoNach=$('txKontoNach').value;
  state.vorlagen=state.vorlagen.filter(x=>x.name!==name);
  state.vorlagen.push(v);
  await saveData(); renderAll(); showMsg('ok','Vorlage gespeichert.');
};
function openTx(id){
  const t=state.transaktionen.find(t=>t.id===id); if(!t) return;
  const k=katById(t.kategorieId);
  const kv=(a,b)=>b?'<div class="kv"><span>'+a+'</span><span>'+esc(b)+'</span></div>':'';
  $('dlgTitle').textContent=txTitel(t);
  $('dlgBody').innerHTML=kv('Art',t.typ)+kv('Datum',fmtDatum(t.datum)+(t.datum>TODAY?' (geplant)':''))+
    kv('Betrag','CHF '+fmtCHF(t.betrag))+kv(t.typ==='Übertrag'?'Von':'Konto',t.konto)+kv('Nach',t.kontoNach)+
    kv('Gruppe',k&&k.gruppe)+kv('Kategorie',k&&k.kategorie)+kv('Notiz',t.notiz)+
    (t.serieId?kv('Herkunft','Dauerauftrag'):'');
  $('dlgEdit').onclick=()=>{ $('txDlg').close(); editTx(id); };
  $('dlgDel').onclick=()=>einmal($('dlgDel'),async()=>{
    if(!confirm('Buchung wirklich löschen?')) return;
    const weg=state.transaktionen.find(x=>x.id===id); if(!weg) return;
    state.transaktionen=state.transaktionen.filter(x=>x.id!==id);
    $('txDlg').close(); await saveData(); renderAll();
    undoToast('Buchung gelöscht.', ()=>einmal(null,async()=>{
      if(state.transaktionen.some(x=>x.id===weg.id)) return;
      state.transaktionen.push(weg); await saveData(); renderAll();
      showMsg('ok','Buchung wiederhergestellt.');
    }));
  });
  $('txDlg').showModal();
}
$('dlgClose').onclick=()=>$('txDlg').close();
function editTx(id){
  const t=state.transaktionen.find(t=>t.id===id); if(!t) return;
  editingTxId=id; setMode(t.typ);
  $('txDatum').value=t.datum; $('txRueck').checked=(+t.betrag<0); $('txBetrag').value=Math.abs(+t.betrag); $('txTitel').value=t.titel||''; $('txNotiz').value=t.notiz||'';
  const k=katById(t.kategorieId);
  $('txGruppe').value=k?k.gruppe:''; fillGK('tx',mode); $('txKategorie').value=t.kategorieId||'';
  $('txKonto').value=t.konto; if(t.kontoNach) $('txKontoNach').value=t.kontoNach;
  $('txTags').value=(t.tags||[]).join(', ');
  $('formTitle').textContent='Buchung bearbeiten'; $('btnCancelEdit').classList.remove('hidden');
  pruefeDatum(); showScreen('erfassen'); formOeffnen('txBetrag');
}
function renderFaellig(){
  const f=faellige();
  $('faelligCard').classList.toggle('hidden', !f.length);
  $('faelligList').innerHTML=f.map((x,i)=>txZeile({...buchungAusSerie(x.serie,x.datum),id:null},
    '<div class="btnrow" style="margin-top:6px">'+
    '<button class="small-btn primary" data-fb="'+i+'">Verbuchen</button>'+
    '<button class="small-btn" data-fe="'+i+'">Anpassen</button>'+
    '<button class="small-btn" data-fs="'+i+'">Überspringen</button></div>')).join('');
  qsa('[data-fb]').forEach(el=>el.onclick=()=>einmal(el,async()=>{ await verbuchen([f[+el.dataset.fb]]); showMsg('ok','Verbucht.'); }));
  // Anpassen: Werte ins Erfassen-Formular legen, Termin merken, noch nichts speichern.
  qsa('[data-fe]').forEach(el=>el.onclick=()=>{ const x=f[+el.dataset.fe]; serieAnpassen(x.serie,x.datum); });
  // Überspringen: Termin dauerhaft als erledigt markieren, ohne Buchung.
  qsa('[data-fs]').forEach(el=>el.onclick=()=>einmal(el,async()=>{
    const x=f[+el.dataset.fs];
    if(!confirm('Termin '+fmtDatum(x.datum)+' von „'+x.serie.titel+'“ überspringen?\n\nEs wird keine Buchung erstellt. Rückgängig machen kannst du das im Reiter „Wiederk.“.')) return;
    x.serie.skip=[...(x.serie.skip||[]), x.datum];
    await saveData(); renderAll(); showMsg('ok','Termin übersprungen.');
  }));
  $('btnFaelligAlle').onclick=()=>einmal($('btnFaelligAlle'),async()=>{
    const n=await verbuchen(f); showMsg('ok',n+' Buchungen erstellt.'); });
}
// Fällige Buchung vor dem Verbuchen bearbeiten: Formular füllen, Termin vormerken.
function serieAnpassen(s,d){
  resetForm();
  setMode(s.typ);
  anpassTermin={serieId:s.id, datum:d};
  $('txDatum').value=d;
  $('txBetrag').value=String(Math.abs(+s.betrag));
  if($('txBetrag')._calcUpd) $('txBetrag')._calcUpd();
  if(s.typ!=='Übertrag') $('txRueck').checked=(+s.betrag<0);
  $('txTitel').value=s.titel||'';
  $('txKonto').value=s.konto||$('txKonto').value;
  if(s.typ==='Übertrag' && s.kontoNach) $('txKontoNach').value=s.kontoNach;
  const k=katById(s.kategorieId);
  if(k){ $('txGruppe').value=k.gruppe; fillGK('tx',s.typ); $('txKategorie').value=k.id; }
  topfSelectTx(); if(s.topfId) $('txTopf').value=s.topfId;
  $('formTitle').textContent='Fällige Buchung anpassen · '+fmtDatum(d);
  $('btnCancelEdit').classList.remove('hidden');
  pruefeDatum(); showScreen('erfassen');
  showMsg('ok','Werte übernommen. Anpassen und speichern – der Termin gilt danach als erledigt.');
}

/* ============================= Budget ============================= */
function fillJahrMonatSelects(){
  const now=new Date(), jahre=[2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030];
  $('dashJahr').innerHTML=jahre.map(j=>'<option'+(j===now.getFullYear()?' selected':'')+'>'+j+'</option>').join('');
  $('dashMonat').innerHTML=MONATE.map((m,i)=>'<option value="'+(i+1)+'"'+(i===now.getMonth()?' selected':'')+'>'+m+'</option>').join('');
}
$('dashJahr').onchange=renderBudget; $('dashMonat').onchange=renderBudget;
function barRow(label,ist,budget,pace,hat){
  if(hat===undefined) hat=budget>0;
  const pct=hat&&budget>0?Math.min(100,ist/budget*100):(hat?100:0);
  const cls=hat?(ist>budget?'over':((pace!=null&&ist>budget*(pace+0.12))||ist>budget*0.9?'warn':'')):'none';
  const w=hat?pct:(ist>0?100:0);
  const tcls=hat?ampel(ist,budget,pace):'';
  return '<div class="brow"><div class="bl"><span class="lbl">'+label+'</span><span><b class="'+tcls+'">'+fmt0(ist)+'</b> / '+(hat?fmt0(budget):'kein Budget')+'</span></div>'+
    '<div class="bar"><div class="f '+cls+'" style="width:'+w+'%"></div>'+(pace&&hat?'<i class="tick" style="left:'+(pace*100)+'%"></i>':'')+'</div></div>';
}
function renderBudget(){
  const jahr=+$('dashJahr').value, monat=+$('dashMonat').value;
  $('thJahr').textContent='Jan–'+MONATE[monat-1].slice(0,3);
  renderFluss(jahr,monat);
  // Saldo = Veränderung des frei verfügbaren Geldes. Sparen fliesst ab, bleibt aber Vermögen.
  // Sparquote = Anteil des Einkommens, der nicht in den Konsum geht.
  const f=(x)=>{ const spar=x.sparen+x.gebunden, saldo=x.ein-x.aus-spar+x.ueber;
    const qz=x.ein?(x.ein-x.aus+x.ueber)/x.ein*100:null;
    return {...x, spar, saldo, q:(qz===null||Math.abs(qz)>999)?'–':Math.round(qz*10)/10+' %'}; };
  const M=f(artSplit(jahr,monat));
  const Y=f(artSplit(jahr,null,monat));
  [['',M],['J',Y]].forEach(([s,v])=>{
    $('kEin'+s).textContent=fmtCHF(v.ein); $('kAus'+s).textContent=fmtCHF(v.aus);
    $('kFix'+s).textContent=fmtCHF(v.fix); $('kVar'+s).textContent=fmtCHF(v.variabel);
    $('kSpar'+s).textContent=fmtCHF(v.spar);
    $('kRueck'+s).textContent=v.ueber>0.005?'+'+fmtCHF(v.ueber):'–';
    const ks=$('kSaldo'+s); ks.textContent=fmtCHF(v.saldo); ks.className='num '+(v.saldo>=0?'pos':'neg');
    $('kQuote'+s).textContent=v.q;
  });
  $('rowRueckKpi').classList.toggle('hidden', !(M.ueber>0.005||Y.ueber>0.005));
  $('rowSparKpi').classList.toggle('hidden', !(M.spar>0.005||Y.spar>0.005));
  const ausK=state.kategorien.filter(k=>k.typ==='Ausgabe' && istKonsum(k));
  const B=budgetMonat(ausK,jahr,monat), rest=B.verf-B.ist;
  const heute=new Date(), lfd=(jahr===heute.getFullYear()&&monat===heute.getMonth()+1);
  const tageRest=lfd?(new Date(jahr,monat,0).getDate()-heute.getDate()+1):0;
  let gesp=0;
  for(let mm=1;mm<=12;mm++){ if(ymKey(jahr,mm)>=YM_HEUTE || mm>monat) break; gesp+=budgetMonat(ausK,jahr,mm).gespart; }
  if(!B.n){
    const erst=Math.min(...ausK.filter(k=>k.bh&&k.bh.length).map(k=>k.bh[0].ab));
    $('restBox').innerHTML='<p class="note">Für '+MONATE[monat-1]+' '+jahr+' ist kein Budget hinterlegt'+
      (isFinite(erst)?' – deine Budgets gelten ab '+ymText(erst)+'.':'.')+' Ausgaben siehst du trotzdem unten und in der Analyse.</p>';
  } else {
    $('restBox').innerHTML='<div class="listrow" style="border:none;padding-top:0"><div class="l"><div class="small">Noch im Budget</div>'+
      '<div class="mid '+(rest<0?'neg':'')+'">'+fmtCHF(rest)+'</div></div><div class="num"><div class="small">Budget gesamt</div><div class="mid">'+fmt0(B.verf)+'</div></div></div>'+
      (lfd&&tageRest>0?'<p class="small">'+tageRest+' Tage übrig · '+fmtCHF(rest/tageRest)+' pro Tag'+(rest<0?' (bereits überzogen)':'')+'</p>':'')+
      (Math.abs(B.roll)>0.5?'<p class="small">davon '+fmtCHF(B.roll)+' Übertrag aus Vormonaten</p>':'')+
      (B.ohne>0.5?'<p class="small">Zusätzlich '+fmtCHF(B.ohne)+' Ausgaben in Kategorien ohne Budget (z. B. Kaution, Möbel).</p>':'')+
      (B.ueber>0.5?'<p class="small">'+fmtCHF(B.ueber)+' erstattet, ohne dass in derselben Kategorie eine Ausgabe in diesem Monat steht – das Geld schreibt keinem Budget etwas gut.</p>':'')+
      (gesp>0.5?'<p class="small">Seit Januar nicht übertragen und damit gespart: '+fmtCHF(gesp)+'</p>':'');
  }
  const block=(name,kats,farbe)=>{
    const g=budgetMonat(kats,jahr,monat), y=budgetJahr(kats,jahr,monat);
    if(!g.verf&&!g.ist&&Math.abs(g.ohne)<0.5&&g.ueber<0.5&&!y.bud) return '';
    const rollTxt = g.roll>0.5?' <span class="small">+'+fmt0(g.roll)+' Übertrag</span>'
      : (g.roll<-0.5?' <span class="small neg">'+fmt0(g.roll)+' Überzug aus Vormonat</span>':'');
    return '<div class="grpblock"><div class="gt">'+(farbe?dot(farbe):'')+esc(name)+rollTxt+'</div>'+
      (g.n?barRow('Monat',g.ist,g.verf,null,true):'')+
      (g.ohne>0.5?'<div class="small" style="margin:-2px 0 8px">'+fmtCHF(g.ohne)+' CHF in Kategorien ohne Budget</div>':'')+
      (g.ueber>0.5?'<div class="small" style="margin:-2px 0 8px">'+fmtCHF(g.ueber)+' CHF erstattet ohne Ausgabe derselben Kategorie</div>':'')+
      (y.bud?barRow('Jahr bis '+MONATE[monat-1],y.istB,y.bud,y.pace,true):'')+'</div>';
  };
  const rueckArten=artenFuer('Ausgabe').filter(a=>a.rolle==='ruecklage');
  $('budgetBars').innerHTML=
    block('Alle Ausgaben',ausK)+
    block('davon Fixkosten',ausK.filter(k=>rolleVon(k)==='fix'))+
    block('davon variabel',ausK.filter(k=>rolleVon(k)==='variabel'))+
    rueckArten.map(a=>block(a.name+' (keine Ausgabe)',
      state.kategorien.filter(k=>k.typ==='Ausgabe'&&kArt(k)===a.id))).join('')+
    gruppenSort('Ausgabe').map(g=>block(g.name,ausK.filter(k=>k.gruppe===g.name),g.farbe)).join('')
    || '<p class="small">Noch keine Daten.</p>';
}

/* ============================= Konten-Screen ============================= */
let editingKonto=null, editingPos=null;
$('koTyp').onchange=()=>{
  const an=$('koTyp').value==='anlage';
  $('lblKoStart').textContent=an?'Vor dem Stichtag eingezahlt':'Startsaldo';
  $('koStartHint').textContent=an
    ? 'Nur nötig, wenn du vor dem Stichtag schon investiert hattest und diese Einzahlungen nicht als Buchungen erfasst sind. Den aktuellen Wert trägst du weiter unten ein.'
    : 'Startsaldo = Kontostand an diesem Tag. Alle Buchungen ab diesem Datum werden dazugerechnet.';
};
$('btnSaveKonto').onclick=async()=>{
  const name=$('koName').value.trim(), typ=$('koTyp').value;
  if(!name){ showMsg('err','Name ausfüllen.'); return; }
  if(state.konten.some(a=>a.name===name && a.id!==editingKonto)){ showMsg('err','Konto existiert schon.'); return; }
  const start=parseFloat($('koStart').value)||0, datum=$('koDatum').value||TODAY;
  if(editingKonto){
    const a=state.konten.find(a=>a.id===editingKonto); const alt=a.name;
    Object.assign(a,{name,typ,startsaldo:start,startdatum:datum});
    if(alt!==name){ state.transaktionen.forEach(t=>{ if(t.konto===alt)t.konto=name; if(t.kontoNach===alt)t.kontoNach=name; });
      state.serien.forEach(s=>{ if(s.konto===alt)s.konto=name; if(s.kontoNach===alt)s.kontoNach=name; }); }
  } else state.konten.push({id:'a'+Date.now()+Math.random(),name,typ,startsaldo:start,startdatum:datum,staende:[]});
  resetKontoForm(); await saveData(); renderAll(); showMsg('ok','Konto gespeichert.');
};
function resetKontoForm(){
  editingKonto=null; $('koName').value=''; $('koStart').value=''; $('koTyp').value='bank'; $('koTyp').onchange();
  $('koDatum').value=TODAY; $('btnCancelKonto').classList.add('hidden'); formSchliessen('koName');
}
$('btnCancelKonto').onclick=resetKontoForm;
function editKonto(id){
  const a=state.konten.find(a=>a.id===id); if(!a) return;
  editingKonto=id; $('koName').value=a.name; $('koTyp').value=a.typ; $('koTyp').onchange();
  $('koStart').value=a.startsaldo||''; $('koDatum').value=a.startdatum||TODAY;
  $('btnCancelKonto').classList.remove('hidden'); formOeffnen('koName',a.name);
}
async function delKonto(id){
  const a=state.konten.find(a=>a.id===id);
  if(state.transaktionen.some(t=>t.konto===a.name||t.kontoNach===a.name)||state.serien.some(s=>s.konto===a.name||s.kontoNach===a.name)){
    showMsg('err','Konto wird von Buchungen oder Daueraufträgen verwendet.'); return; }
  if(!confirm('Konto „'+a.name+'“ löschen?')) return;
  state.konten=state.konten.filter(x=>x.id!==id); await saveData(); renderAll();
}
/* renderKonten: ersetzt in phase34.js */

/* --- Wert eines Anlagekontos erfassen --- */
$('wKontoSel').onchange=renderWert;
function aktAnlage(){ return state.konten.find(a=>a.id===$('wKontoSel').value); }
function renderWert(){
  const anl=state.konten.filter(a=>a.typ==='anlage');
  const sel=$('wKontoSel'), prev=sel.value;
  sel.innerHTML=anl.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('');
  if(anl.some(a=>a.id===prev)) sel.value=prev;
  const keine=!anl.length;
  $('wHint').classList.toggle('hidden',!keine);
  qsa('#wertCard .wform').forEach(el=>el.classList.toggle('hidden',keine));
  const a=aktAnlage();
  if(!a){ $('wListe').innerHTML=''; return; }
  const w=kontoWert(a), e=kontoEinstand(a), gv=kontoGV(a);
  $('wInfo').innerHTML='<div class="kv"><span>Aktueller Wert</span><span><b>'+fmtCHF(w)+'</b></span></div>'+
    '<div class="kv"><span>Netto eingezahlt</span><span>'+fmtCHF(e)+'</span></div>'+
    (gv===null?'<p class="small">Noch kein Wert erfasst – bis dahin gilt der eingezahlte Betrag.</p>'
      :'<div class="kv"><span>Gewinn/Verlust</span><span class="'+(gv>=0?'pos':'neg')+'"><b>'+(gv>=0?'+':'')+fmtCHF(gv)+'</b>'+
        (e>0?' ('+(gv>=0?'+':'')+(Math.round(gv/e*1000)/10)+' %)':'')+'</span></div>');
  $('wListe').innerHTML=staende(a).reverse().map(s=>
    '<div class="listrow"><div class="l">'+fmtDatum(s.datum)+'</div><div class="btnrow" style="align-items:center">'+
    '<b class="num">'+fmtCHF(s.wert)+'</b><button class="small-btn danger" data-wd="'+esc(s.id)+'">✕</button></div></div>').join('')
    ||'<p class="small">Noch kein Wert erfasst.</p>';
  qsa('#wListe [data-wd]').forEach(el=>el.onclick=async()=>{
    a.staende=a.staende.filter(s=>s.id!==el.dataset.wd); await saveData(); renderAll(); });
}
$('btnSaveWert').onclick=async()=>{
  const a=aktAnlage(); if(!a){ showMsg('err','Kein Anlagekonto vorhanden.'); return; }
  const datum=$('wDatum').value||TODAY, wert=parseFloat($('wWert').value);
  if(!isFinite(wert)){ showMsg('err','Wert eingeben.'); return; }
  a.staende=(a.staende||[]).filter(s=>s.datum!==datum);
  a.staende.push({id:'w'+Date.now()+Math.random(),datum,wert});
  $('wWert').value=''; await saveData(); renderAll(); showMsg('ok','Wert gespeichert.');
};

/* --- Sparziele --- */
let editingZiel=null;
function sparrate(){
  // Durchschnittlicher Monatssaldo der letzten 6 abgeschlossenen Monate
  const heute=new Date(); let sum=0,n=0;
  for(let i=1;i<=6;i++){
    const d=new Date(heute.getFullYear(),heute.getMonth()-i,1);
    const j=d.getFullYear(), mo=d.getMonth()+1;
    const x=artSplit(j,mo);
    if(x.ein||x.aus||x.sparen){ sum+=x.ein-x.aus+x.ueber; n++; }
  }
  return n?sum/n:0;
}
/* zielStand: ersetzt in phase34.js */

/* renderZiele: ersetzt in phase34.js */

$('btnSaveZiel').onclick=async()=>{
  const name=$('zName').value.trim(), betrag=parseFloat($('zBetrag').value)||0;
  if(!name||betrag<=0){ showMsg('err','Name und Zielbetrag ausfüllen.'); return; }
  const o={name,betrag,datum:$('zDatum').value||null,kontoId:$('zKonto').value||null};
  if(editingZiel) Object.assign(state.ziele.find(z=>z.id===editingZiel),o);
  else state.ziele.push(Object.assign({id:'z'+Date.now()},o));
  resetZielForm(); await saveData(); renderAll(); showMsg('ok','Ziel gespeichert.');
};
function resetZielForm(){ editingZiel=null; $('zName').value=''; $('zBetrag').value=''; $('zDatum').value='';
  $('btnCancelZiel').classList.add('hidden'); formSchliessen('zName'); }
$('btnCancelZiel').onclick=resetZielForm;

/* --- Vermögensverlauf --- */
$('btnSnap').onclick=async()=>{
  const total=vermoegenHeute();
  state.vermoegen=state.vermoegen.filter(v=>v.datum!==TODAY);
  state.vermoegen.push({id:'v'+Date.now(),datum:TODAY,total,
    detail:state.konten.map(a=>({name:a.name,wert:Math.round(kontoWert(a)*100)/100}))});
  await saveData(); renderAll(); showMsg('ok','Stand gesichert: CHF '+fmtCHF(total));
};
function renderVermoegen(){
  const hist=Object.values(state.hist.verm).map(h=>({datum:h.datum,lohn:h.lohn,spar:h.spar,anl:h.anl,kry:h.kry,son:h.son,hist:true}));
  const all=[...hist,...state.vermoegen].sort((a,b)=>a.datum.localeCompare(b.datum));
  $('vermLine').innerHTML=svgLine([{name:'Vermögen',pts:all.map(v=>({x:v.datum.slice(5,7)+'.'+v.datum.slice(2,4),y:vermTotal(v)}))}],340,170);
  $('vermTable').innerHTML=all.slice().reverse().slice(0,12).map(v=>
    '<div class="listrow"><div class="l">'+fmtDatum(v.datum)+(v.hist?' <span class="pill" style="margin:0">migriert</span>':'')+'</div>'+
    '<div class="btnrow" style="align-items:center"><b class="num">'+fmtCHF(vermTotal(v))+'</b>'+
    (v.hist?'':'<button class="small-btn danger" data-vd="'+esc(v.id)+'">✕</button>')+'</div></div>').join('');
  qsa('[data-vd]').forEach(el=>el.onclick=async()=>{
    if(!confirm('Schnappschuss löschen?')) return;
    state.vermoegen=state.vermoegen.filter(v=>v.id!==el.dataset.vd); await saveData(); renderAll(); });
}

/* ============================= Abos ============================= */
let serMode='Ausgabe', editingSerie=null;
$('serSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-mode]'); if(b) setSerMode(b.dataset.mode); });
function setSerMode(m){
  serMode=m;
  qsa('#serSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  const ueb=m==='Übertrag';
  $('serRowNach').classList.toggle('hidden',!ueb);
  $('serLblKonto').textContent=ueb?'Von Konto':'Konto';
  $('serLblGruppe').textContent=ueb?'Gruppe (optional)':'Gruppe';
  $('serLblKat').textContent=ueb?'Kategorie (optional)':'Kategorie';
  $('serRowRueck').classList.remove('hidden');
  $('serLblRueck').textContent = ueb
    ? 'Gegenbuchung: holt Geld aus der gewählten Kategorie zurück'
    : m==='Einnahme'
    ? 'Rückzahlung: wiederkehrender Betrag, den ich zurückgebe'
    : 'Rückerstattung: wiederkehrender Beitrag, der diese Ausgabe senkt';
  fillGK('ser',serMode);
  topfSelectSer();
}
function topfSelectSer(){ fillTopfSelect('serTopf', serMode, $('serKonto').value, $('serKontoNach').value); }
$('serGruppe').onchange=()=>fillGK('ser',serMode);
$('serKonto').onchange=topfSelectSer;
$('serKontoNach').onchange=topfSelectSer;
$('btnSaveSerie').onclick=async()=>{
  const titel=$('serTitel').value.trim();
  let betrag=rechne($('serBetrag').value);
  if(betrag===null){ showMsg('err','Betrag nicht lesbar. Erlaubt sind Zahlen und + - * / ( ).'); return; }
  const sGegen = serMode==='Übertrag' && $('serRueck').checked;
  if(serMode!=='Übertrag' && $('serRueck').checked) betrag=-Math.abs(betrag);
  const start=$('serStart').value, ende=$('serEnde').value||null;
  const n=parseInt($('serN').value)||1, einheit=$('serEinheit').value;
  const konto=$('serKonto').value, nach=$('serKontoNach').value, kategorieId=$('serKategorie').value;
  if(!titel||!isFinite(betrag)||betrag===0||!start){ showMsg('err','Titel, Betrag und erste Zahlung ausfüllen.'); return; }
  if(serMode==='Übertrag'&&konto===nach){ showMsg('err','Von- und Nach-Konto müssen verschieden sein.'); return; }
  if(serMode!=='Übertrag'&&!kategorieId){ showMsg('err','Kategorie wählen.'); return; }
  const o={typ:serMode,titel,betrag,kategorieId:kategorieId||null,konto,n,einheit,start,ende,
    auto:$('serAuto').checked,aktiv:true};
  const sTopf=$('serTopf').value; if(sTopf) o.topfId=sTopf;
  if(sGegen) o.gegen=true; 
  if(serMode==='Übertrag') o.kontoNach=nach;
  if(editingSerie){ const s=state.serien.find(s=>s.id===editingSerie); delete s.kontoNach; Object.assign(s,o); }
  else {
    const s=Object.assign({id:'s'+Date.now()+Math.random(),letzte:null},o);
    const alt=serieTermine(s,s.start,TODAY);
    if(alt.length && !confirm(alt.length+' Zahlung(en) liegen in der Vergangenheit. Sollen diese Buchungen jetzt erstellt werden?\n\nOK = erstellen, Abbrechen = erst ab heute buchen.')){
      s.letzte=alt[alt.length-1];
    }
    state.serien.push(s);
  }
  resetSerieForm(); await saveData(); await autoVerbuchen(); renderAll(); showMsg('ok','Dauerauftrag gespeichert.');
};
function resetSerieForm(){
  editingSerie=null; $('serTitel').value=''; $('serBetrag').value=''; $('serEnde').value=''; $('serRueck').checked=false;
  if($('serTopf')) $('serTopf').value='';
  $('serN').value=1; $('serEinheit').value='M'; $('serAuto').checked=true;
  formSchliessen('serTitel'); $('btnCancelSerie').classList.add('hidden');
}
$('btnCancelSerie').onclick=resetSerieForm;
function editSerie(id){
  const s=state.serien.find(s=>s.id===id); if(!s) return;
  editingSerie=id; setSerMode(s.typ);
  $('serTitel').value=s.titel; $('serRueck').checked=(+s.betrag<0); $('serBetrag').value=Math.abs(+s.betrag); $('serN').value=s.n; $('serEinheit').value=s.einheit;
  topfSelectSer(); $('serTopf').value=s.topfId||''; if(s.typ==='Übertrag') $('serRueck').checked=!!s.gegen;
  $('serStart').value=s.start; $('serEnde').value=s.ende||''; $('serAuto').checked=s.auto!==false;
  const k=katById(s.kategorieId);
  $('serGruppe').value=k?k.gruppe:''; fillGK('ser',serMode); $('serKategorie').value=s.kategorieId||'';
  $('serKonto').value=s.konto; if(s.kontoNach) $('serKontoNach').value=s.kontoNach;
  $('btnCancelSerie').classList.remove('hidden'); formOeffnen('serTitel',s.titel);
}
function rhythmusText(s){
  const e={T:'Tage',W:'Wochen',M:'Monate',J:'Jahre'}[s.einheit];
  const einz={T:'täglich',W:'wöchentlich',M:'monatlich',J:'jährlich'}[s.einheit];
  return (+s.n===1)?einz:('alle '+s.n+' '+e);
}
// A3: Uebertraege brutto zu summieren ist aussagelos – Hin- und Rueckbuchung zwischen
// eigenen Konten zaehlen beide mit. Darum je Konto der Nettozufluss pro Monat: was
// hineinlaeuft minus was abfliesst. Toepfe stehen als Unterzeile darunter.
// Keine Farbe: ein Uebertrag ist weder Einnahme noch Ausgabe, das Vorzeichen genuegt.
function ueberNetto(serien){
  const kto={};
  const bucht=(name,betrag,topfId)=>{
    if(!name) return;
    const e=kto[name]||(kto[name]={netto:0,toepfe:{}});
    e.netto+=betrag;
    if(topfId){ const t=topfById(topfId); if(t) e.toepfe[t.name]=(e.toepfe[t.name]||0)+betrag; }
  };
  serien.filter(s=>s.typ==='Übertrag').forEach(s=>{
    const mb=serieMonatsBetrag(s);
    bucht(s.kontoNach,mb,s.topfId);
    bucht(s.konto,-mb,null);
  });
  return Object.keys(kto).map(name=>({name,netto:kto[name].netto,toepfe:kto[name].toepfe}))
    .filter(x=>Math.abs(x.netto)>=0.005).sort((a,b)=>b.netto-a.netto);
}
function renderUeberNetto(aktiv){
  const vz=v=>(v>0?'+':'−')+fmtCHF(Math.abs(v))+' / Mt';
  const rows=ueberNetto(aktiv);
  $('fixUebBox').innerHTML = rows.length ? rows.map(r=>
    '<div class="kv"><span>Überträge netto · '+esc(r.name)+'</span><span class="num">'+vz(r.netto)+'</span></div>'+
    Object.keys(r.toepfe).filter(n=>Math.abs(r.toepfe[n])>=0.005).map(n=>
      '<div class="kv small"><span>davon Topf '+esc(n)+'</span><span class="num">'+vz(r.toepfe[n])+'</span></div>').join('')
  ).join('') : '<div class="kv"><span>Regelmässige Überträge</span><span class="num">–</span></div>';
  return rows.length;
}
function renderAbos(){
  const aktiv=state.serien.filter(s=>s.aktiv!==false);
  const mt=f=>aktiv.filter(f).reduce((s,x)=>s+serieMonatsBetrag(x),0);
  const mAus=mt(s=>s.typ==='Ausgabe'), mEin=mt(s=>s.typ==='Einnahme');
  $('fixMonat').textContent=fmtCHF(mAus); $('fixJahr').textContent=fmtCHF(mAus*12);
  $('fixAus').textContent=mAus?fmtCHF(mAus)+' / Mt':'–';
  $('fixEin').textContent=mEin?'+'+fmtCHF(mEin)+' / Mt':'–';
  const ueb=renderUeberNetto(aktiv);
  // Zusammenfassung in der Klappe: was man sieht, ohne sie zu oeffnen.
  const teile=[];
  if(mEin) teile.push('Einnahmen +'+fmt0(mEin));
  if(ueb) teile.push('Überträge auf '+ueb+(ueb===1?' Konto':' Konten'));
  $('fixSum').textContent=teile.length?' · '+teile.join(' · '):'';
  $('serList').innerHTML=state.serien.map(s=>{
    const k=katById(s.kategorieId), next=naechsterTermin(s);
    const neg=+s.betrag<0;
    const zeichen=s.typ==='Übertrag'?'':((s.typ==='Einnahme')!==neg?'+':'−');
    return '<div class="listrow"><div class="l"><div>'+(k?dot(gFarbe(k.gruppe)):'')+'<b>'+esc(s.titel)+'</b>'+(s.aktiv===false?' <span class="tag rep">pausiert</span>':'')+
      (s.auto===false?' <span class="tag rep">manuell</span>':'')+'</div>'+
      '<div class="small">'+rhythmusText(s)+' · '+esc(k?k.kategorie:'ohne Kategorie')+' · '+esc(s.konto)+(s.kontoNach?' → '+esc(s.kontoNach):'')+'</div>'+
      '<div class="small">'+(next?'nächste: '+fmtDatum(next):'beendet')+' · '+fmtCHF(Math.abs(serieMonatsBetrag(s)))+'/Mt'+(neg?' · Rückerstattung':'')+'</div>'+
      ((s.skip||[]).length?'<div class="small">'+s.skip.length+' Termin(e) übersprungen: '+s.skip.slice(-3).map(fmtDatum).join(', ')+(s.skip.length>3?' …':'')+'</div>':'')+
      '<div class="btnrow" style="margin-top:6px"><button class="small-btn" data-se="'+esc(s.id)+'">Bearb.</button>'+
      '<button class="small-btn" data-sp="'+esc(s.id)+'">'+(s.aktiv===false?'Aktivieren':'Pausieren')+'</button>'+
      ((s.skip||[]).length?'<button class="small-btn" data-sr="'+esc(s.id)+'">Übersprungene zurückholen</button>':'')+
      '<button class="small-btn danger" data-sd="'+esc(s.id)+'">Löschen</button></div></div>'+
      '<div class="num mid '+(s.typ==='Übertrag'?'':(zeichen==='+'?'pos':'neg'))+'">'+zeichen+fmtCHF(Math.abs(s.betrag))+'</div></div>';
  }).join('')||'<p class="small">Noch keine Daueraufträge.</p>';
  qsa('[data-se]').forEach(el=>el.onclick=()=>editSerie(el.dataset.se));
  qsa('[data-sp]').forEach(el=>el.onclick=async()=>{
    const s=state.serien.find(s=>s.id===el.dataset.sp); s.aktiv=(s.aktiv===false); await saveData(); renderAll(); });
  qsa('[data-sr]').forEach(el=>el.onclick=async()=>{
    const s=state.serien.find(s=>s.id===el.dataset.sr);
    if(!confirm((s.skip||[]).length+' übersprungene Termine wieder als fällig anzeigen?')) return;
    delete s.skip; await saveData(); renderAll(); showMsg('ok','Termine wieder fällig.'); });
  qsa('[data-sd]').forEach(el=>el.onclick=async()=>{
    if(!confirm('Dauerauftrag löschen? Bereits erstellte Buchungen bleiben erhalten.')) return;
    state.serien=state.serien.filter(s=>s.id!==el.dataset.sd); await saveData(); renderAll(); });
}

/* ============================= Analyse ============================= */
function svgLine(series,w,h){
  const n=series[0].pts.length;
  if(n<1) return '<p class="small">Noch keine Daten.</p>';
  const all=series.flatMap(s=>s.pts.map(p=>p.y));
  const max=Math.max(1,...all), min=Math.min(0,...all), range=(max-min)||1;
  const L=46,R=10,T=8,B=26, W=w, H=h+T+B+(series.length>1?22:0);
  const xAt=i=> n===1?L+(w-L-R)/2:L+i/(n-1)*(w-L-R);
  const yAt=v=>T+h-((v-min)/range*h);
  const farbe={Einnahmen:'var(--good)',Ausgaben:'var(--bad)',Saldo:'var(--accent)',Vermögen:'var(--accent)'};
  const col=nm=>farbe[nm]||'var(--accent)';
  const lab=v=>Math.abs(v)>=1000?(Math.round(v/100)/10)+'k':Math.round(v);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img">';
  [min,(min+max)/2,max].forEach(v=>{
    s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+yAt(v)+'" y2="'+yAt(v)+'" stroke="currentColor" opacity=".15"/>'+
      '<text x="'+(L-5)+'" y="'+(yAt(v)+4)+'" font-size="12" text-anchor="end" fill="currentColor" opacity=".8">'+lab(v)+'</text>';
  });
  series.forEach(ser=>{
    const pts=ser.pts.map((p,i)=>[xAt(i),yAt(p.y)]);
    if(n===1) s+='<circle cx="'+pts[0][0]+'" cy="'+pts[0][1]+'" r="4" fill="'+col(ser.name)+'"/>';
    else s+='<polyline fill="none" stroke="'+col(ser.name)+'" stroke-width="2.5" stroke-linejoin="round" points="'+pts.map(p=>p.join(',')).join(' ')+'"/>'+
      pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.5" fill="'+col(ser.name)+'"/>').join('');
  });
  const step=Math.max(1,Math.ceil(n/6));
  series[0].pts.forEach((p,i)=>{ if(i%step&&i!==n-1) return;
    s+='<text x="'+xAt(i)+'" y="'+(T+h+17)+'" font-size="12" text-anchor="middle" fill="currentColor" opacity=".85">'+esc(p.x)+'</text>'; });
  if(series.length>1) series.forEach((ser,i)=>{ const x=L+i*92,y=T+h+B+4;
    s+='<rect x="'+x+'" y="'+y+'" width="11" height="11" rx="2" fill="'+col(ser.name)+'"/><text x="'+(x+16)+'" y="'+(y+10)+'" font-size="12" fill="currentColor">'+ser.name+'</text>'; });
  return s+'</svg>';
}
let anaPane='ueber';
$('anaSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-a]'); if(!b) return;
  anaPane=b.dataset.a; qsa('#anaSeg button').forEach(x=>x.classList.toggle('on',x.dataset.a===anaPane));
  ['ueber','verlauf','abos'].forEach(p=>$('ana-'+p).classList.toggle('hidden',p!==anaPane));
  renderAnalyse(); });
$('anaZeit').onchange=renderAnalyse; $('anaKatSel').onchange=renderKatVerlauf;
function datenJahre(){ agg(); return Object.keys(AGGJ).sort(); }
function fillAnaZeit(){
  const sel=$('anaZeit'), prev=sel.value, j=datenJahre();
  sel.innerHTML='<option value="12">Letzte 12 Monate</option><option value="24">Letzte 24 Monate</option>'+
    '<option value="all">Gesamter Zeitraum</option>'+j.slice().reverse().map(y=>'<option value="j'+y+'">Jahr '+y+'</option>').join('');
  sel.value=[...sel.options].some(o=>o.value===prev)?prev:'12';
}
// Zeitraum immer monatsgenau: {vj,vm,bj,bm,n,label,jahr}
function anaZeitraum(){
  const v=$('anaZeit').value||'12', hj=+TODAY.slice(0,4), hm=+TODAY.slice(5,7);
  if(v.startsWith('j')){ const j=+v.slice(1), bis=(j===hj)?hm:12;
    return {vj:j,vm:1,bj:j,bm:bis,n:bis,label:'Jahr '+j,jahr:j}; }
  if(v==='all'){ const js=datenJahre(); const j0=js.length?+js[0]:hj;
    return {vj:j0,vm:1,bj:hj,bm:hm,n:(hj-j0)*12+hm,label:'seit '+j0,jahr:null}; }
  const n=+v, d=new Date(hj,hm-1-(n-1),1);
  return {vj:d.getFullYear(),vm:d.getMonth()+1,bj:hj,bm:hm,n,label:'letzte '+n+' Monate',jahr:null};
}
function monateIm(z){ const out=[]; let j=z.vj,m=z.vm;
  while(j<z.bj||(j===z.bj&&m<=z.bm)){ out.push([j,m]); m++; if(m>12){m=1;j++;} } return out; }
function erstattetZ(z,katId){ agg();
  return monateIm(z).reduce((s,[j,m])=>s+(katId?(AGGE['Ausgabe|'+j+'|'+m+'|'+katId]||0)
    :state.kategorien.reduce((x,k)=>x+(AGGE['Ausgabe|'+j+'|'+m+'|'+k.id]||0),0)),0); }
function sumZ(typ,z,katId){ const a=agg();
  return monateIm(z).reduce((s,[j,m])=>s+(katId?(a[typ+'|'+j+'|'+m+'|'+katId]||0)
    :state.kategorien.reduce((x,k)=>x+(a[typ+'|'+j+'|'+m+'|'+k.id]||0),0)),0); }
function monatsReihe(typ,z,katId){ const a=agg();
  return monateIm(z).map(([j,m])=>katId?(a[typ+'|'+j+'|'+m+'|'+katId]||0)
    :state.kategorien.reduce((x,k)=>x+(a[typ+'|'+j+'|'+m+'|'+k.id]||0),0)); }
function median(arr){ if(!arr.length) return 0; const s=arr.slice().sort((a,b)=>a-b), h=s.length>>1;
  return s.length%2?s[h]:(s[h-1]+s[h])/2; }
function svgDonut(items,w){
  const tot=items.reduce((s,i)=>s+i.v,0); if(tot<=0) return '<p class="small">Keine Ausgaben im Zeitraum.</p>';
  const cx=w/2, cy=w/2, r=w*0.40, ri=w*0.25; let a0=-Math.PI/2, s='<svg viewBox="0 0 '+w+' '+w+'" role="img">';
  items.forEach(it=>{
    const a1=a0+it.v/tot*Math.PI*2, gross=(a1-a0)>Math.PI?1:0;
    const P=(ang,rad)=>[(cx+Math.cos(ang)*rad).toFixed(2),(cy+Math.sin(ang)*rad).toFixed(2)];
    const [x0,y0]=P(a0,r),[x1,y1]=P(a1,r),[x2,y2]=P(a1,ri),[x3,y3]=P(a0,ri);
    s+='<path d="M'+x0+','+y0+' A'+r+','+r+' 0 '+gross+' 1 '+x1+','+y1+' L'+x2+','+y2+
       ' A'+ri+','+ri+' 0 '+gross+' 0 '+x3+','+y3+' Z" fill="'+it.c+'"></path>';
    a0=a1;
  });
  s+='<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" font-size="'+(w*0.09)+'" font-weight="700" fill="currentColor">'+fmt0(tot)+'</text>';
  s+='<text x="'+cx+'" y="'+(cy+w*0.08)+'" text-anchor="middle" font-size="'+(w*0.05)+'" fill="currentColor" opacity=".7">CHF Ausgaben</text>';
  return s+'</svg>';
}
function hBars(items){
  const max=Math.max(1,...items.map(i=>i.v));
  return items.map(i=>'<div class="hbar"><div class="hl"><div class="ht"><span>'+esc(i.l)+'</span><span class="num"><b>'+fmt0(i.v)+'</b>'+
    (i.sub?' <span class="small">'+esc(i.sub)+'</span>':'')+'</span></div>'+
    '<div class="hb"><i style="width:'+(i.v/max*100)+'%;background:'+(i.c||'var(--accent)')+'"></i></div></div></div>').join('');
}
function svgMonate(aus,ein,w,h){
  const max=Math.max(1,...aus,...ein);
  const L=46,R=8,T=8,B=24, H=h+T+B, bw=(w-L-R)/12;
  const yAt=v=>T+h-(v/max*h);
  const lab=v=>Math.abs(v)>=1000?(Math.round(v/100)/10)+'k':Math.round(v);
  let s='<svg viewBox="0 0 '+w+' '+H+'" role="img">';
  [0,max/2,max].forEach(v=>{ s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+yAt(v)+'" y2="'+yAt(v)+'" stroke="currentColor" opacity=".15"/>'+
    '<text x="'+(L-5)+'" y="'+(yAt(v)+4)+'" font-size="11" text-anchor="end" fill="currentColor" opacity=".8">'+lab(v)+'</text>'; });
  aus.forEach((v,i)=>{ if(!v) return;
    s+='<rect x="'+(L+i*bw+2)+'" y="'+yAt(v)+'" width="'+(bw-4)+'" height="'+(T+h-yAt(v))+'" fill="var(--bad)" opacity=".85" rx="2"/>'; });
  const pts=ein.map((v,i)=>[L+i*bw+bw/2,yAt(v)]).filter((p,i)=>ein[i]||aus[i]);
  if(pts.length>1) s+='<polyline fill="none" stroke="var(--good)" stroke-width="2.5" points="'+pts.map(p=>p.join(',')).join(' ')+'"/>';
  pts.forEach(p=>{ s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.5" fill="var(--good)"/>'; });
  for(let i=0;i<12;i+=2) s+='<text x="'+(L+i*bw+bw/2)+'" y="'+(T+h+16)+'" font-size="11" text-anchor="middle" fill="currentColor" opacity=".85">'+MONATE[i].slice(0,3)+'</text>';
  return s+'</svg>';
}
function svgReihe(labels,werte,schnitt,farbe,w,h){
  const max=Math.max(1,...werte,schnitt);
  const L=46,R=8,T=8,B=26, H=h+T+B, bw=(w-L-R)/Math.max(1,werte.length);
  const yAt=v=>T+h-(v/max*h);
  const lab=v=>Math.abs(v)>=1000?(Math.round(v/100)/10)+'k':Math.round(v);
  let s='<svg viewBox="0 0 '+w+' '+H+'" role="img">';
  [0,max/2,max].forEach(v=>{ s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+yAt(v)+'" y2="'+yAt(v)+'" stroke="currentColor" opacity=".15"/>'+
    '<text x="'+(L-5)+'" y="'+(yAt(v)+4)+'" font-size="11" text-anchor="end" fill="currentColor" opacity=".8">'+lab(v)+'</text>'; });
  werte.forEach((v,i)=>{ if(!v) return;
    s+='<rect x="'+(L+i*bw+1.5)+'" y="'+yAt(v)+'" width="'+Math.max(2,bw-3)+'" height="'+(T+h-yAt(v))+'" fill="'+farbe+'" rx="2"/>'; });
  if(schnitt>0) s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+yAt(schnitt)+'" y2="'+yAt(schnitt)+'" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity=".65"/>';
  const step=Math.max(1,Math.ceil(werte.length/6));
  labels.forEach((l,i)=>{ if(i%step && i!==labels.length-1) return;
    s+='<text x="'+(L+i*bw+bw/2)+'" y="'+(T+h+16)+'" font-size="11" text-anchor="middle" fill="currentColor" opacity=".85">'+esc(l)+'</text>'; });
  return s+'</svg>';
}
function serieImZeitraum(s,z){
  const von=z.vj+'-'+String(z.vm).padStart(2,'0')+'-01', bis=monatsEnde(z.bj,z.bm);
  return serieTermine(s,von,bis).length;
}
function renderAnalyse(){
  fillAnaZeit();
  const z=anaZeitraum(), ausK=state.kategorien.filter(k=>k.typ==='Ausgabe');
  const aus=sumZ('Ausgabe',z), ein=sumZ('Einnahme',z);
  const mAus=monatsReihe('Ausgabe',z), mEin=monatsReihe('Einnahme',z);
  if(anaPane==='ueber'){
    const saldo=ein-aus;
    $('anaKpi').innerHTML='<div class="listrow" style="border:none;padding-top:0"><div class="l"><div class="small">Ausgaben '+esc(z.label)+'</div>'+
      '<div class="big">'+fmtCHF(aus)+'</div></div><div class="num"><div class="small">Ø pro Monat</div><div class="mid">'+fmt0(aus/z.n)+'</div></div></div>'+
      '<div class="kv"><span>Einnahmen</span><span class="pos num">'+fmtCHF(ein)+'</span></div>'+
      '<div class="kv"><span>Saldo</span><span class="num '+(saldo>=0?'pos':'neg')+'">'+fmtCHF(saldo)+'</span></div>'+
      '<div class="kv"><span>Sparquote</span><span class="num">'+(ein?Math.round(saldo/ein*1000)/10+' %':'–')+'</span></div>'+
      '<div class="kv"><span>Typischer Monat (Median)</span><span class="num">'+fmt0(median(mAus))+'</span></div>'+
      (erstattetZ(z)>0.5?'<div class="kv"><span>davon zurückerstattet</span><span class="num pos">'+fmtCHF(erstattetZ(z))+'</span></div>':'')+
      '<div class="kv"><span>Teuerster / günstigster Monat</span><span class="num">'+fmt0(Math.max(...mAus,0))+' / '+fmt0(Math.min(...mAus,0))+'</span></div>';
    const gr=gruppenSort('Ausgabe').map(g=>({l:g.name,c:g.farbe||'#888',
      v:katsSort(g.name,'Ausgabe').reduce((s,k)=>s+sumZ('Ausgabe',z,k.id),0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    const tot=gr.reduce((s,x)=>s+x.v,0);
    $('anaDonut').innerHTML=svgDonut(gr,260);
    $('anaDonutLeg').innerHTML=gr.map(g=>'<div class="legrow">'+dot(g.c)+'<span>'+esc(g.l)+'</span>'+
      '<span class="lv"><b>'+fmt0(g.v)+'</b> · '+(Math.round(g.v/tot*1000)/10)+' %</span></div>').join('');
    const kats=ausK.map(k=>({l:k.kategorie,c:gFarbe(k.gruppe),v:sumZ('Ausgabe',z,k.id)}))
      .filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    $('anaTopKat').innerHTML=kats.length?hBars(kats.slice(0,10).map(x=>Object.assign({sub:'· '+fmt0(x.v/z.n)+'/Mt'},x))):'<p class="small">Keine Ausgaben im Zeitraum.</p>';
    const von=z.vj+'-'+String(z.vm).padStart(2,'0')+'-01', bis=monatsEnde(z.bj,z.bm);
    const top=state.transaktionen.filter(t=>t.typ==='Ausgabe'&&t.datum>=von&&t.datum<=bis&&t.datum<=TODAY&&t.betrag>0)
      .sort((a,b)=>b.betrag-a.betrag).slice(0,8);
    $('anaTopTx').innerHTML=top.map(t=>txZeile(t)).join('')||'<p class="small">Keine Ausgaben im Zeitraum.</p>';
    qsa('#anaTopTx .tx[data-id]').forEach(el=>el.onclick=()=>openTx(el.dataset.id));
    const jahrModus=!!z.jahr;
    $('thSpalte2').textContent='Ø/Mt'; $('thSpalte3').textContent=jahrModus?'Budget':'Anteil';
    $('anaTabInfo').textContent=jahrModus?'Budget = Summe der Monate, in denen ein Budget galt.':'Im gewählten Zeitraum. Budgets siehst du in der Jahresansicht.';
    $('ausTable').innerHTML=gruppenSort('Ausgabe').map(g=>{
      const ks=katsSort(g.name,'Ausgabe').map(k=>({k,v:sumZ('Ausgabe',z,k.id),y:jahrModus?budgetJahr([k],z.jahr,z.bm):null})).filter(x=>x.v||(x.y&&x.y.bud));
      if(!ks.length) return '';
      const gv=ks.reduce((s,x)=>s+x.v,0), gb=jahrModus?budgetJahr(katsSort(g.name,'Ausgabe'),z.jahr,z.bm).bud:0;
      const z3=(v,b)=>jahrModus?'<td class="num">'+(b?fmt0(b):'–')+'</td>':'<td class="num">'+(tot?Math.round(v/tot*1000)/10+' %':'–')+'</td>';
      return '<tr class="grp"><td>'+dot(g.farbe)+brechbar(g.name)+'</td><td class="num">'+fmt0(gv)+'</td><td class="num">'+fmt0(gv/z.n)+'</td>'+z3(gv,gb)+'</tr>'+
        ks.map(x=>{ const er=erstattetZ(z,x.k.id);
          return '<tr><td>'+brechbar(x.k.kategorie)+
            (er>0.5?'<div class="small">'+fmt0(x.v+er)+' bezahlt − '+fmt0(er)+' erstattet</div>':'')+
            '</td><td class="num">'+fmt0(x.v)+'</td><td class="num">'+fmt0(x.v/z.n)+'</td>'+z3(x.v,x.y&&x.y.bud)+'</tr>'; }).join('');
    }).join('')||'<tr><td colspan="4" class="small">Keine Daten.</td></tr>';
  }
  if(anaPane==='verlauf'){
    const jahr=z.jahr||+TODAY.slice(0,4);
    $('monatsChart').innerHTML=svgMonate(
      Array.from({length:12},(_,i)=>ausSplit(jahr,i+1).aus),
      Array.from({length:12},(_,i)=>liveSum('Einnahme',jahr,i+1)),340,150);
    const sel=$('anaKatSel'), prev=sel.value;
    sel.innerHTML='<option value="">Alle Ausgaben</option>'+gruppenSort('Ausgabe').map(g=>
      '<option value="g:'+esc(g.name)+'">Gruppe: '+esc(g.name)+'</option>'+
      katsSort(g.name,'Ausgabe').map(k=>'<option value="k:'+esc(k.id)+'">   '+esc(k.kategorie)+'</option>').join('')).join('');
    if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
    renderKatVerlauf();
    const bisM=z.jahr?z.bm:12;
    const jahrFuerBudget=z.jahr||+TODAY.slice(0,4);
    const rows=gruppenSort('Ausgabe').map(g=>{
      const ks=katsSort(g.name,'Ausgabe'), y=budgetJahr(ks,jahrFuerBudget,bisM);
      return {g:g.name,farbe:g.farbe,ist:ks.reduce((s,k)=>s+sumZ('Ausgabe',z,k.id),0),bud:y.bud,istB:y.istB,pace:y.pace};
    });
    const yT=budgetJahr(state.kategorien.filter(k=>k.typ==='Ausgabe'),jahrFuerBudget,bisM);
    $('ausBar').innerHTML=[{g:'Gesamt',ist:aus,bud:yT.bud,istB:yT.istB,pace:yT.pace},...rows].filter(r=>r.ist||r.bud)
      .map(r=>'<div class="grpblock"><div class="gt">'+(r.farbe?dot(r.farbe):'')+esc(r.g)+'</div>'+
        (r.bud?barRow('Jahr '+jahrFuerBudget,r.istB,r.bud,r.pace,true):barRow(z.label,r.ist,0,null,false))+'</div>').join('')
      ||'<p class="small">Keine Daten.</p>';
    $('ausLegend').textContent='Budgetvergleich immer für das Jahr '+jahrFuerBudget+' und nur über Monate, in denen ein Budget galt.';
    const js=datenJahre().map(Number), hj=+TODAY.slice(0,4);
    const jahre=[...new Set([...js,hj])].sort();
    $('trendLine').innerHTML=svgLine([
      {name:'Einnahmen',pts:jahre.map(j=>({x:j,y:jahrTotal('Einnahme',j)}))},
      {name:'Ausgaben',pts:jahre.map(j=>({x:j,y:jahrTotal('Ausgabe',j)}))},
      {name:'Saldo',pts:jahre.map(j=>({x:j,y:jahrTotal('Einnahme',j)-jahrTotal('Ausgabe',j)}))}],340,170);
  }
  if(anaPane==='abos'){
    const aktiv=state.serien.filter(s=>s.aktiv!==false);
    const fixMt=aktiv.filter(s=>s.typ==='Ausgabe').reduce((s,x)=>s+serieMonatsBetrag(x),0);
    const anteil=aus/z.n>0?fixMt/(aus/z.n)*100:0;
    const ausMt=aus/z.n;
    $('anaFixKpi').innerHTML='<div class="listrow" style="border:none;padding-top:0"><div class="l"><div class="small">Fixkosten pro Monat</div>'+
      '<div class="big neg">'+fmtCHF(fixMt)+'</div></div><div class="num"><div class="small">Anteil an Ø '+fmt0(ausMt)+'</div>'+
      '<div class="mid">'+(ausMt?Math.round(anteil)+' %':'–')+'</div></div></div>'+
      '<div class="bar" style="margin-top:6px"><div class="f '+(anteil>70?'over':(anteil>50?'warn':''))+'" style="width:'+Math.min(100,anteil)+'%"></div></div>'+
      '<div class="kv" style="margin-top:10px"><span>Frei verfügbar pro Monat</span><span class="num">'+fmtCHF(Math.max(0,ausMt-fixMt))+'</span></div>'+
      '<div class="kv"><span>Fixkosten pro Jahr</span><span class="num">'+fmtCHF(fixMt*12)+'</span></div>';
    const liste=aktiv.filter(s=>s.typ==='Ausgabe').map(s=>({l:s.titel,c:gFarbe((katById(s.kategorieId)||{}).gruppe),
      v:serieMonatsBetrag(s)*12,sub:'· '+fmtCHF(serieMonatsBetrag(s))+'/Mt'})).sort((a,b)=>b.v-a.v);
    $('anaAboListe').innerHTML=liste.length?hBars(liste)+'<p class="small" style="margin-top:10px">Beträge als Jahreskosten. Prüf einmal im Jahr, was du davon wirklich nutzt.</p>'
      :'<p class="small">Noch keine Daueraufträge erfasst. Lege sie unter „Wiederk.“ an, dann siehst du hier deine Fixkosten.</p>';
  }
}
function renderKatVerlauf(){
  const z=anaZeitraum(), sel=$('anaKatSel').value;
  const mon=monateIm(z), a=agg();
  let werte, farbe='var(--accent)', name='Alle Ausgaben';
  if(sel.startsWith('k:')){ const k=katById(sel.slice(2)); if(!k) return;
    werte=mon.map(([j,m])=>a['Ausgabe|'+j+'|'+m+'|'+k.id]||0); farbe=gFarbe(k.gruppe); name=k.kategorie; }
  else if(sel.startsWith('g:')){ const g=sel.slice(2), ks=katsSort(g,'Ausgabe');
    werte=mon.map(([j,m])=>ks.reduce((s,k)=>s+(a['Ausgabe|'+j+'|'+m+'|'+k.id]||0),0)); farbe=gFarbe(g); name=g; }
  else werte=monatsReihe('Ausgabe',z);
  const labels=mon.map(([j,m])=>MONATE[m-1].slice(0,3)+(m===1||mon.length>14?' '+String(j).slice(2):''));
  const schnitt=werte.reduce((s,v)=>s+v,0)/Math.max(1,werte.length);
  $('anaKatChart').innerHTML=svgReihe(labels,werte,schnitt,farbe,340,150);
  const letzte=werte[werte.length-1]||0;
  $('anaKatInfo').innerHTML=esc(name)+': Ø '+fmtCHF(schnitt)+' pro Monat (gestrichelt), Median '+fmtCHF(median(werte))+
    ', höchster Monat '+fmtCHF(Math.max(...werte,0))+'. Aktueller Monat '+fmtCHF(letzte)+
    (schnitt>0?' ('+(letzte>=schnitt?'+':'')+Math.round((letzte/schnitt-1)*100)+' % zum Schnitt)':'')+'.';
}

/* ============================= Mehr: Kategorien & Gruppen ============================= */
$('mehrSeg').addEventListener('click',e=>{ const b=e.target.closest('button[data-p]'); if(b) mehrPane(b.dataset.p); });
function mehrPane(p){
  qsa('#mehrSeg button').forEach(x=>x.classList.toggle('on',x.dataset.p===p));
  $('pane-kat').classList.toggle('hidden',p!=='kat'); $('pane-daten').classList.toggle('hidden',p!=='daten');
}
function budgetText(k){
  const v=bVerAkt(k);
  if(!v||!(+v.budget)) return 'kein Budget';
  return fmt0(v.budget)+' / '+(v.rhythmus==='J'?'Jahr':'Monat')+(+v.rollover?' · '+v.rollover+' % Übertrag':'');
}
function renderMehr(){
  $('katUebersicht').innerHTML=gruppenSort().map(g=>{
    const ks=katsSort(g.name);
    const sum=ks.reduce((s,k)=>s+bMv(bVerAkt(k)),0);
    return '<div class="card" style="border-left:6px solid '+esc(g.farbe||'#888')+'">'+
      '<div class="listrow" data-g="'+esc(g.name)+'" style="cursor:pointer;padding-top:0"><div class="l"><div class="gt" style="margin:0">'+dot(g.farbe)+esc(g.name)+'</div>'+
      '<div class="small">'+g.typ+' · '+ks.length+' Kategorien'+(sum?' · '+fmt0(sum)+' pro Monat':'')+'</div></div><span class="small">✎</span></div>'+
      ks.map(k=>'<div class="listrow" data-k="'+esc(k.id)+'" style="cursor:pointer"><div class="l"><div>'+esc(k.kategorie)+
        (istKonsum(k)?'':' <span class="tag rep">'+esc(artName(k))+'</span>')+'</div>'+
        '<div class="small">'+artName(k)+' · '+budgetText(k)+'</div></div><span class="small">›</span></div>').join('')+
      '<button class="small-btn" data-nk="'+esc(g.name)+'" style="margin-top:8px">+ Kategorie in '+esc(g.name)+'</button></div>';
  }).join('');
  qsa('#katUebersicht [data-g]').forEach(el=>el.onclick=()=>openGrp(el.dataset.g));
  qsa('#katUebersicht [data-k]').forEach(el=>el.onclick=()=>openCat(el.dataset.k));
  qsa('#katUebersicht [data-nk]').forEach(el=>el.onclick=()=>openCat(null,el.dataset.nk));
  renderArten();
}
$('btnNeueKat').onclick=()=>openCat(null,null);
$('btnNeueGruppe').onclick=()=>openGrp(null);

/* --- Kategorie-Dialog --- */
function ymInput(ab){ return Math.floor(ab/100)+'-'+String(ab%100).padStart(2,'0'); }
function openCat(id,gruppe){
  editingCatId=id||null;
  const k=id?katById(id):null, v=k?bVerAkt(k):null;
  $('catGruppe').innerHTML=gruppenSort().map(g=>'<option>'+esc(g.name)+'</option>').join('');
  $('catGruppe').value=k?k.gruppe:(gruppe||(gruppenSort('Ausgabe')[0]||{}).name||'');
  $('catName').value=k?k.kategorie:'';
  $('catBudget').value=v&&+v.budget?v.budget:'';
  $('catRhythmus').value=v?v.rhythmus:'M';
  $('catRoll').value=v?(+v.rollover||0):0;
  $('catAb').value=ymInput(YM_HEUTE);
  const gTyp=(state.gruppen.find(g=>g.name===$('catGruppe').value)||{}).typ||'Ausgabe';
  fillCatArt(gTyp, k?kArt(k):artVorschlag({typ:gTyp,kategorie:$('catName').value||'',gruppe:$('catGruppe').value}));
  $('catGruppe').onchange=()=>{
    const t=(state.gruppen.find(g=>g.name===$('catGruppe').value)||{}).typ||'Ausgabe';
    fillCatArt(t, $('catArt').value);
  };
  $('catDlgTitle').textContent=k?'Kategorie bearbeiten':'Neue Kategorie';
  $('btnDelCat').classList.toggle('hidden',!k);
  renderCatHist(k);
  $('catDlg').showModal();
}
function renderCatHist(k){
  if(!k||!(k.bh||[]).length){ $('catHist').innerHTML=''; return; }
  $('catHist').innerHTML='<h3>Budget-Verlauf</h3>'+k.bh.map((h,i)=>
    '<div class="listrow"><div class="l small">ab '+ymText(h.ab)+': '+(+h.budget?fmt0(h.budget)+' / '+(h.rhythmus==='J'?'Jahr':'Monat')+' · '+(+h.rollover||0)+' %':'kein Budget')+'</div>'+
    (k.bh.length>1?'<button class="small-btn danger" data-bhd="'+i+'">✕</button>':'')+'</div>').join('');
  qsa('#catHist [data-bhd]').forEach(el=>el.onclick=async()=>{
    if(!confirm('Diese Budget-Version löschen? Die Monate fallen dann auf die vorherige Version zurück.')) return;
    k.bh.splice(+el.dataset.bhd,1); syncAkt(k); await saveData(); renderAll(); renderCatHist(k);
  });
}
$('catRhythmus').onchange=()=>{ if(!editingCatId) $('catRoll').value=$('catRhythmus').value==='J'?100:0; };
$('btnCloseCat').onclick=()=>$('catDlg').close();
$('btnSaveCat').onclick=async()=>{
  const gruppe=$('catGruppe').value, kategorie=$('catName').value.trim();
  const g=state.gruppen.find(g=>g.name===gruppe);
  if(!g){ showMsg('err','Zuerst eine Gruppe anlegen.'); return; }
  if(!kategorie){ showMsg('err','Name ausfüllen.'); return; }
  if(state.kategorien.some(k=>k.kategorie.toLowerCase()===kategorie.toLowerCase()&&k.id!==editingCatId)){ showMsg('err','Kategoriename existiert schon.'); return; }
  const ver={budget:parseFloat($('catBudget').value)||0, rhythmus:$('catRhythmus').value,
    rollover:Math.max(0,Math.min(100,parseFloat($('catRoll').value)||0))};
  const abTxt=$('catAb').value||ymInput(YM_HEUTE), ab=+abTxt.replace('-','').slice(0,6);
  if(!(ab>190001)){ showMsg('err','„Gilt ab“ ungültig.'); return; }
  if(editingCatId){
    const k=katById(editingCatId);
    Object.assign(k,{gruppe,kategorie,typ:g.typ,art:$('catArt').value});
    const alt=bVer(k,Math.floor(ab/100),ab%100);
    const gleich=alt && +alt.budget===ver.budget && alt.rhythmus===ver.rhythmus && +alt.rollover===ver.rollover;
    if(!gleich){
      const same=k.bh.find(h=>h.ab===ab);
      if(same) Object.assign(same,ver); else k.bh.push(Object.assign({ab},ver));
      k.bh.sort((a,b)=>a.ab-b.ab);
    }
    syncAkt(k);
  } else {
    const k={id:'k'+Date.now()+Math.random(),gruppe,kategorie,typ:g.typ,art:$('catArt').value,bh:[Object.assign({ab},ver)]};
    syncAkt(k); state.kategorien.push(k);
  }
  $('catDlg').close(); await saveData(); renderAll(); showMsg('ok','Gespeichert.');
};
$('btnDelCat').onclick=async()=>{
  const id=editingCatId; if(!id) return;
  if(state.transaktionen.some(t=>t.kategorieId===id)||state.serien.some(s=>s.kategorieId===id)){
    showMsg('err','Kategorie wird von Buchungen verwendet und kann nicht gelöscht werden. Setze stattdessen das Budget auf 0.'); return; }
  if(!confirm('Kategorie löschen?')) return;
  state.kategorien=state.kategorien.filter(k=>k.id!==id); $('catDlg').close(); await saveData(); renderAll();
};

/* --- Gruppen-Dialog --- */
let editingGrp=null;
function openGrp(name){
  editingGrp=name;
  const g=name?state.gruppen.find(g=>g.name===name):null;
  const belegt=g&&state.kategorien.some(k=>k.gruppe===g.name);
  $('grpName').value=g?g.name:''; $('grpTyp').value=g?g.typ:'Ausgabe'; $('grpTyp').disabled=!!belegt;
  $('grpFarbe').value=g&&g.farbe?g.farbe:PALETTE[state.gruppen.length%PALETTE.length];
  $('grpDlgTitle').textContent=g?'Gruppe bearbeiten':'Neue Gruppe';
  $('btnDelGrp').classList.toggle('hidden',!g);
  $('grpHint').classList.toggle('hidden',!belegt);
  $('grpDlg').showModal();
}
$('btnCloseGrp').onclick=()=>$('grpDlg').close();
$('btnSaveGrp').onclick=async()=>{
  const name=$('grpName').value.trim(), typ=$('grpTyp').value, farbe=$('grpFarbe').value;
  if(!name){ showMsg('err','Name ausfüllen.'); return; }
  if(state.gruppen.some(g=>g.name.toLowerCase()===name.toLowerCase()&&g.name!==editingGrp)){ showMsg('err','Gruppe existiert schon.'); return; }
  if(editingGrp){
    const g=state.gruppen.find(g=>g.name===editingGrp);
    state.kategorien.forEach(k=>{ if(k.gruppe===g.name) k.gruppe=name; });
    Object.assign(g,{name,farbe}); if(!$('grpTyp').disabled) g.typ=typ;
  } else state.gruppen.push({name,typ,farbe});
  $('grpDlg').close(); await saveData(); renderAll(); showMsg('ok','Gruppe gespeichert.');
};
$('btnDelGrp').onclick=async()=>{
  const g=state.gruppen.find(g=>g.name===editingGrp); if(!g) return;
  if(state.kategorien.some(k=>k.gruppe===g.name)){ showMsg('err','Gruppe enthält noch Kategorien – erst verschieben oder löschen.'); return; }
  if(!confirm('Gruppe „'+g.name+'“ löschen?')) return;
  state.gruppen=state.gruppen.filter(x=>x!==g); $('grpDlg').close(); await saveData(); renderAll();
};

/* ============================= CSV ============================= */
const csvCell=v=>{ const s=String(v==null?'':v); return /[",;\n\t]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
function parseCSV(text){
  text=String(text).replace(/^﻿/,'');
  const lines=text.split(/\r?\n/).filter(l=>l.trim().length);
  if(!lines.length) return {header:[],rows:[]};
  const sep=['\t',';',','].reduce((b,c)=>(lines[0].split(c).length>lines[0].split(b).length)?c:b,',');
  const parseLine=l=>{ const out=[]; let cur='',inQ=false;
    for(let i=0;i<l.length;i++){ const c=l[i];
      if(inQ){ if(c=='"'){ if(l[i+1]=='"'){cur+='"';i++;} else inQ=false; } else cur+=c; }
      else { if(c=='"') inQ=true; else if(c===sep){ out.push(cur); cur=''; } else cur+=c; } }
    out.push(cur); return out; };
  return {header:parseLine(lines[0]).map(h=>h.trim()), rows:lines.slice(1).map(parseLine)};
}
function parseDatum(s){
  s=String(s||'').trim();
  let m=s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
  if(m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
}
const num=v=>{ const f=parseFloat(String(v||'').replace(/['\s]/g,'').replace(',','.')); return isFinite(f)?f:0; };
$('btnExportCsv').onclick=()=>{
  const rows=[['Datum','Konto','Gruppe','Kategorie','Typ','Betrag','Titel','Notiz','Konto nach','Tags']];
  state.transaktionen.slice().sort((a,b)=>a.datum.localeCompare(b.datum)).forEach(t=>{
    const k=katById(t.kategorieId);
    rows.push([t.datum,t.konto,k?k.gruppe:'',k?k.kategorie:'',t.typ,t.betrag,t.titel||'',t.notiz||'',t.kontoNach||'',(t.tags||[]).join(', ')]);
  });
  const blob=new Blob(['﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='finanz-export-'+TODAY+'.csv'; document.body.appendChild(a); a.click(); a.remove();
};
function kontoOderNeu(name){
  const n=(name||'').trim(); if(!n) return state.konten[0]?state.konten[0].name:'Lohnkonto';
  if(!state.konten.some(a=>a.name===n)) state.konten.push({id:'a'+Date.now()+Math.random(),name:n,typ:'bank',startsaldo:0,startdatum:TODAY,staende:[]});
  return n;
}
$('btnImportCsv').onclick=()=>$('csvInput').click();
$('csvInput').onchange=async e=>{
  const file=e.target.files[0]; if(!file) return; e.target.value='';
  const {header,rows}=parseCSV(await file.text());
  if(header.includes('Buchungsdatum')&&header.some(h=>h.startsWith('Kategoriename'))){ mehrPane('daten'); mfStart(header,rows); return; }
  if(!(header.includes('Datum')&&header.includes('Kategorie'))){ showMsg('err','Kopfzeile nicht erkannt.'); return; }
  const col=n=>header.indexOf(n), hasTitel=header.includes('Titel');
  let imported=0,ungueltig=0; const fehlend=new Set();
  rows.forEach(c=>{
    const get=n=>col(n)>=0?(c[col(n)]||'').trim():'';
    const datum=parseDatum(get('Datum')); if(!get('Datum')) return;
    if(!datum){ ungueltig++; return; }
    const typ=get('Typ'), k=katByName(get('Kategorie'));
    if(typ!=='Übertrag'&&!k){ fehlend.add(get('Kategorie')||'(leer)'); return; }
    const t={id:'t'+Date.now()+Math.random(),datum,konto:kontoOderNeu(get('Konto')),kategorieId:k?k.id:null,
      typ:typ||(k?k.typ:'Ausgabe'),betrag:num(get('Betrag')),titel:hasTitel?get('Titel'):get('Notiz'),notiz:hasTitel?get('Notiz'):'',
      tags:get('Tags')?get('Tags').split(',').map(s=>s.trim()).filter(Boolean):[]};
    if(t.typ==='Übertrag') t.kontoNach=kontoOderNeu(get('Konto nach'));
    state.transaktionen.push(t); imported++;
  });
  await saveData(); renderAll();
  showMsg(fehlend.size||ungueltig?'err':'ok', imported+' Buchungen importiert'+(ungueltig?', '+ungueltig+' mit unlesbarem Datum':'')+
    (fehlend.size?'. Unbekannte Kategorien: '+[...fehlend].slice(0,5).join(', '):'')+'.');
};

/* ============================= Import-Assistent „Meine Finanzen“ ============================= */
// Vorschläge: alter Kategoriename|Art (0 = Einnahme, 1 = Ausgabe) -> Ziel.
// kat:Name = Kategorie, ueb:Konto = Übertrag, skip = nicht importieren. r = Titel-Regeln.
const MF_VORSCHLAG={
  'Arbeit|0':'kat:Lohn (netto)','Militär|1':'kat:Diverses','Zins|0':'kat:Zins/Kapitalertrag',
  'Familie|1':'kat:Geschenke/Spenden',
  'Geschenke|0':'kat:Geschenke erhalten','Geschenke|1':'kat:Geschenke/Spenden','Spenden|1':'kat:Geschenke/Spenden',
  'Verkauf|0':'kat:Verkauf','Elektronik|0':'kat:Verkauf','Kleidung|0':'kat:Verkauf',
  'Ausgeliehen|0':'kat:Sonstige Einnahmen','Beitrag|0':'kat:Sonstige Einnahmen','Gefunden|0':'kat:Sonstige Einnahmen',
  'Casino|0':'kat:Sonstige Einnahmen','Casino|1':'kat:Freizeit','Schule|0':'kat:Sonstige Einnahmen',
  'Schule|1':'kat:Weiterbildung','Essen Schule|1':'kat:Auswärtige Verpflegung',
  'Essen Trinken|1':{z:'kat:Restaurant',r:[['migros|coop|volg|denner|aldi|lidl|einkauf|landi','kat:Lebensmittel']]},
  'Essen Trinken|0':{z:'kat:Restaurant',r:[['migros|coop|volg|denner|aldi|lidl|einkauf','kat:Lebensmittel']]},
  'ÖV|1':{z:'kat:Einzeltickets',r:[['GA|abo|halbtax','kat:ÖV-Abo']]},'ÖV|0':'kat:ÖV-Abo',
  'Netflix|1':'kat:Streaming','Spotify|1':'kat:Streaming','Disney +|1':'kat:Streaming','Sky|1':'kat:Streaming','Twitch|1':'kat:Streaming',
  'Handyrechnung|1':'kat:Handy-Abo','Elektronik|1':'kat:Elektronik','Kleidung|1':'kat:Kleider/Schuhe','Bücher|1':'kat:Bücher/Medien',
  'Friseur|1':'kat:Coiffeur','Kosmetika|1':'kat:Coiffeur','Parfüm|1':'kat:Coiffeur','Gesundheit und Schönheitspflege|1':'kat:Coiffeur',
  'Fitness|1':'kat:Fitness','Fussball|1':'kat:Fitness','Freizeit|1':'kat:Freizeit',
  'Auto|1':'kat:Taxi','Taxi|1':'kat:Taxi','Urlaub|1':'kat:Ferien','Euro|1':'kat:Ferien',
  'Steuern|1':'kat:Steuer','Bund|1':'kat:Steuer','Gemeinde|1':'kat:Steuer','AHV|1':'kat:Diverses','Wohnen|1':'kat:Möbel',
  // Umschichtungen auf eigene Anlagekonten haengen vom eigenen Depot ab: bewusst ohne
  // Vorschlag, damit der Assistent nach dem Zielkonto fragt statt eines zu erfinden.
  'Übertragung|1':'skip','Übertragung|0':'skip',
  'Anpassung|1':'skip','Anpassung|0':'skip'
};
const MF_KONTO={'Persönliches Konto':'Lohnkonto','Kleingeld':'Lohnkonto'};
let MF=null;
$('btnImportMF').onclick=()=>$('mfInput').click();
$('mfInput').onchange=async e=>{
  const file=e.target.files[0]; if(!file) return; e.target.value='';
  const {header,rows}=parseCSV(await file.text());
  if(!(header.includes('Buchungsdatum'))){ showMsg('err','Das ist kein Export aus „Meine Finanzen“.'); return; }
  mfStart(header,rows);
};
function mfZielAufloesen(z){
  if(!z) return '';
  if(z==='skip') return 'skip';
  const [art,name]=[z.slice(0,3),z.slice(4)];
  if(art==='kat'){
    const n=name.toLowerCase();
    const k=state.kategorien.find(k=>k.kategorie.toLowerCase()===n)
      || state.kategorien.find(k=>k.kategorie.toLowerCase().startsWith(n))
      || state.kategorien.find(k=>k.kategorie.toLowerCase().includes(n));
    return k?'kat:'+k.id:'';
  }
  if(art==='ueb') return state.konten.some(a=>a.name===name)?'ueb:'+name:'neu:'+name;
  return z.startsWith('neu:')?z:'';
}
function mfVorschlag(kat,art){
  const gesp=(state.einst.mfMap||{})[kat+'|'+art];
  if(gesp) return gesp;
  let v=MF_VORSCHLAG[kat+'|'+art];
  if(!v && art==='0'){ const a=MF_VORSCHLAG[kat+'|1']; if(a && String(a.z||a).startsWith('kat:')) v=a; }   // Rückerstattung
  if(!v){
    const n=kat.toLowerCase();
    const k=n.length>=4 && state.kategorien.find(k=>k.kategorie.toLowerCase().includes(n)||n.includes(k.kategorie.toLowerCase()));
    v=k?'kat:'+k.kategorie:'';
  }
  const o=typeof v==='string'?{z:v,r:[]}:{z:v.z,r:v.r||[]};
  return {ziel:mfZielAufloesen(o.z), regeln:o.r.map(([p,z])=>[p,mfZielAufloesen(z)])};
}
function mfOptionen(art,sel){
  const opt=(v,l)=>'<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(l)+'</option>';
  let h=opt('','— bitte wählen —')+opt('skip','Nicht importieren');
  h+='<optgroup label="Ausgaben">'+gruppenSort('Ausgabe').flatMap(g=>katsSort(g.name,'Ausgabe'))
    .map(k=>opt('kat:'+k.id,k.gruppe+' · '+k.kategorie+(art==='0'?' (Rückerstattung)':''))).join('')+'</optgroup>';
  h+='<optgroup label="Einnahmen">'+gruppenSort('Einnahme').flatMap(g=>katsSort(g.name,'Einnahme'))
    .map(k=>opt('kat:'+k.id,k.kategorie+(art==='1'?' (Rückbuchung)':''))).join('')+'</optgroup>';
  const neu=new Set((MF?MF.neuKonten:[]));
  if(sel&&sel.startsWith('neu:')) neu.add(sel.slice(4));
  h+='<optgroup label="Übertrag (eigenes Konto)">'+state.konten.map(a=>opt('ueb:'+a.name,'↔ '+a.name)).join('')+
    [...neu].filter(n=>!state.konten.some(a=>a.name===n)).map(n=>opt('neu:'+n,'↔ neues Anlagekonto „'+n+'“')).join('')+'</optgroup>';
  return h;
}
function mfStart(header,rows){
  const ix=n=>header.indexOf(n);
  const iD=ix('Buchungsdatum'), iA=ix('Art'), iT=ix('Titel'), iB=ix('Betrag'), iN=ix('Notiz'), iK=ix('Kategoriename'), iKo=ix('Kontoname');
  const daten=[], kombi={}, konten={}; let ungueltig=0;
  rows.forEach(c=>{
    const datum=parseDatum(c[iD]); if(!datum){ if((c[iD]||'').trim()) ungueltig++; return; }
    const art=String(c[iA]).trim()==='0'?'0':'1', kat=(c[iK]||'').trim()||'(ohne)', konto=(c[iKo]||'').trim()||'(ohne)';
    const r={datum,art,titel:(c[iT]||'').trim(),betrag:num(c[iB]),notiz:(c[iN]||'').trim(),kat,konto};
    daten.push(r);
    const key=kat+'|'+art; (kombi[key]||(kombi[key]={kat,art,n:0,sum:0})); kombi[key].n++; kombi[key].sum+=r.betrag;
    konten[konto]=(konten[konto]||0)+1;
  });
  daten.sort((a,b)=>a.datum.localeCompare(b.datum));
  const bankStart=state.konten.filter(a=>a.typ!=='anlage').map(a=>a.startdatum).filter(Boolean).sort()[0];
  MF={daten,kombi:Object.values(kombi).sort((a,b)=>b.n-a.n),konten,ungueltig,neuKonten:[],
    bis: bankStart?addDays(bankStart,-1):TODAY};
  MF.kombi.forEach(k=>{ k.v=mfVorschlag(k.kat,k.art);
    [k.v.ziel,...k.v.regeln.map(r=>r[1])].forEach(z=>{ if(z&&z.startsWith('neu:')&&!MF.neuKonten.includes(z.slice(4))) MF.neuKonten.push(z.slice(4)); }); });
  mfRender();
}
function mfRegelHtml(art,p,z){
  return '<div class="mfregel" style="margin-top:8px;padding-left:10px;border-left:3px solid var(--border)"><div class="small">Wenn Titel enthält (mehrere mit | trennen):</div><input type="text" class="mfP" value="'+esc(p)+'" placeholder="z. B. migros|coop" '+
    'style="width:100%;margin:4px 0;padding:8px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);min-height:40px">'+
    '<div class="btnrow" style="flex-wrap:nowrap"><select class="mfZ" style="flex:1;min-width:0;padding:8px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);min-height:40px">'+
    mfOptionen(art,z)+'</select><button class="small-btn danger mfRx" type="button">✕</button></div></div>';
}
function mfRender(){
  const d=MF.daten, von=d.length?d[0].datum:'', bis=d.length?d[d.length-1].datum:'';
  const kontoSel=(alt)=>{ const def=state.einst.mfKonten&&state.einst.mfKonten[alt] || MF_KONTO[alt] || (state.konten.some(a=>a.name===alt)?alt:(state.konten[0]||{}).name);
    return '<select class="mfKo" data-alt="'+esc(alt)+'" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);min-height:40px">'+
      state.konten.map(a=>'<option'+(a.name===def?' selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select>'; };
  $('mfWizard').innerHTML=
    '<p class="note">'+d.length+' Buchungen vom '+fmtDatum(von)+' bis '+fmtDatum(bis)+(MF.ungueltig?' · '+MF.ungueltig+' Zeilen ohne lesbares Datum':'')+
    '. Du ordnest jede alte Kategorie einmal zu. Vorschläge sind vorausgefüllt, prüfe vor allem die gelb markierten.</p>'+
    '<h3>1. Stichtag</h3><div class="field"><label>Nur Buchungen bis und mit</label><input type="date" id="mfBis" value="'+MF.bis+'"></div>'+
    '<label class="check"><input type="checkbox" id="mfDup" checked> Doppelte überspringen (gleiches Datum und Betrag)</label>'+
    '<p class="small">Vorgeschlagen ist der Tag vor deinem Startsaldo. Spätere Buchungen hast du bereits hier erfasst, sie würden sonst doppelt zählen.</p>'+
    '<h3>2. Konten</h3>'+Object.entries(MF.konten).map(([alt,n])=>'<div class="field"><label>'+esc(alt)+' ('+n+'×) →</label>'+kontoSel(alt)+'</div>').join('')+
    '<h3>3. Kategorien</h3>'+MF.kombi.map((k,i)=>{
      const unsicher=!k.v.ziel;
      return '<div class="grpblock mfrow" data-i="'+i+'"'+(unsicher?' style="background:rgba(227,162,26,.12);padding:10px;border-radius:9px"':'')+'>'+
        '<div class="bl"><b>'+esc(k.kat)+'</b><span class="small">'+(k.art==='0'?'Einnahme':'Ausgabe')+' · '+k.n+'× · '+fmt0(k.sum)+'</span></div>'+
        '<select class="mfZiel" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);min-height:42px">'+mfOptionen(k.art,k.v.ziel)+'</select>'+
        '<div class="mfRegeln">'+k.v.regeln.map(([p,z])=>mfRegelHtml(k.art,p,z)).join('')+'</div>'+
        '<button class="small-btn mfAdd" type="button" style="margin-top:6px">+ Regel „Titel enthält …“</button></div>';
    }).join('')+
    '<p class="small">„Rückerstattung“: Geld, das du für eine Ausgabe zurückbekommst (z. B. Netflix-Anteil von Kollegen), senkt die Ausgaben dieser Kategorie statt als Einkommen zu zählen. '+
    'Überträge auf Anlagekonten erscheinen dort als „eingezahlt“.</p>'+
    '<div class="btnrow" style="margin-top:12px"><button class="primary" id="mfGo">Importieren</button><button id="mfAbbr">Abbrechen</button></div>';
  $('mfWizard').classList.remove('hidden');
  qsa('#mfWizard .mfAdd').forEach(b=>b.onclick=()=>{ const row=b.closest('.mfrow'), k=MF.kombi[+row.dataset.i];
    row.querySelector('.mfRegeln').insertAdjacentHTML('beforeend',mfRegelHtml(k.art,'','')); mfBind(); });
  $('mfAbbr').onclick=()=>{ MF=null; $('mfWizard').classList.add('hidden'); $('mfWizard').innerHTML=''; };
  $('mfGo').onclick=mfImport;
  mfBind();
}
function mfBind(){ qsa('#mfWizard .mfRx').forEach(b=>b.onclick=()=>b.closest('.mfregel').remove()); }
function mfLesen(){
  const map={};
  qsa('#mfWizard .mfrow').forEach(row=>{
    const k=MF.kombi[+row.dataset.i];
    const regeln=[...row.querySelectorAll('.mfregel')].map(r=>[r.querySelector('.mfP').value.trim(),r.querySelector('.mfZ').value]).filter(r=>r[0]&&r[1]);
    map[k.kat+'|'+k.art]={ziel:row.querySelector('.mfZiel').value, regeln};
  });
  return map;
}
async function mfImport(){
  const map=mfLesen();
  const offen=MF.kombi.filter(k=>!map[k.kat+'|'+k.art].ziel).map(k=>k.kat);
  if(offen.length){ showMsg('err','Noch nicht zugeordnet: '+offen.slice(0,6).join(', ')); return; }
  const kontoMap={}; qsa('#mfWizard .mfKo').forEach(s=>kontoMap[s.dataset.alt]=s.value);
  const bis=$('mfBis').value||TODAY, dup=$('mfDup').checked;
  const sig=t=>t.datum+'|'+Math.round(Math.abs(t.betrag)*100)+'|'+(t.typ==='Übertrag'?'U':'B');
  const vorhanden=new Set(state.transaktionen.map(sig));
  // Kurze Suchwörter (z. B. „GA“) nur als ganzes Wort, sonst trifft „ga“ auch „Garage“
  const regex=p=>{ try{ return new RegExp(p.split('|').map(s=>s.trim()).filter(Boolean)
    .map(s=>{ const e=s.replace(/[.*+?^${}()[\]\\]/g,'\\$&'); return s.length<=3?'\\b'+e+'\\b':e; }).join('|'),'i'); }catch(e){ return null; } };
  const kompiliert={}; Object.entries(map).forEach(([key,m])=>kompiliert[key]=m.regeln.map(([p,z])=>[regex(p),z]).filter(r=>r[0]));
  const importId='imp'+Date.now(); let n=0, skip=0, dupl=0, spaet=0;
  const neuKonto=name=>{ if(!state.konten.some(a=>a.name===name)) state.konten.push({id:'a'+Date.now()+Math.random(),name,typ:'anlage',startsaldo:0,startdatum:TODAY,staende:[]}); return name; };
  for(const r of MF.daten){
    if(r.datum>bis){ spaet++; continue; }
    const key=r.kat+'|'+r.art; let z=map[key].ziel;
    for(const [rx,zz] of kompiliert[key]) if(rx.test(r.titel)){ z=zz; break; }
    if(z==='skip'){ skip++; continue; }
    const konto=kontoMap[r.konto]||state.konten[0].name;
    let t;
    if(z.startsWith('kat:')){
      const k=katById(z.slice(4)); if(!k){ skip++; continue; }
      const gegen=(r.art==='0'&&k.typ==='Ausgabe')||(r.art==='1'&&k.typ==='Einnahme');
      t={datum:r.datum,konto,kategorieId:k.id,typ:k.typ,betrag:gegen?-r.betrag:r.betrag};
    } else {
      const ziel=z.startsWith('neu:')?neuKonto(z.slice(4)):z.slice(4);
      if(ziel===konto){ skip++; continue; }
      t={datum:r.datum,typ:'Übertrag',kategorieId:null,betrag:r.betrag,
        konto:r.art==='1'?konto:ziel, kontoNach:r.art==='1'?ziel:konto};
    }
    Object.assign(t,{id:'t'+Date.now()+Math.random()+n,titel:r.titel,notiz:r.notiz,tags:[],importId});
    if(dup&&vorhanden.has(sig(t))){ dupl++; continue; }
    state.transaktionen.push(t); n++;
  }
  // Anlagekonten: Einzahlungen ab der ersten importierten Einzahlung zählen
  state.konten.filter(a=>a.typ==='anlage'&&!(+a.startsaldo)).forEach(a=>{
    const erste=state.transaktionen.filter(t=>t.importId===importId&&(t.kontoNach===a.name||t.konto===a.name)).map(t=>t.datum).sort()[0];
    if(erste&&erste<a.startdatum) a.startdatum=erste;
  });
  state.einst.mfMap=map; state.einst.mfKonten=kontoMap; state.einst.letzterImport={id:importId,n,datum:TODAY};
  MF=null; $('mfWizard').classList.add('hidden'); $('mfWizard').innerHTML='';
  await saveData(); renderAll();
  showMsg('ok',n+' Buchungen importiert'+(dupl?', '+dupl+' Doppelte übersprungen':'')+(skip?', '+skip+' bewusst nicht importiert':'')+(spaet?', '+spaet+' nach Stichtag':'')+'.');
}
function renderImportInfo(){
  const l=state.einst.letzterImport;
  const vorhanden=l&&state.transaktionen.some(t=>t.importId===l.id);
  $('mfUndo').classList.toggle('hidden',!vorhanden);
  if(vorhanden) $('mfUndo').textContent='Import vom '+fmtDatum(l.datum)+' rückgängig ('+l.n+' Buchungen)';
}
$('mfUndo').onclick=async()=>{
  const l=state.einst.letzterImport; if(!l) return;
  if(!confirm(l.n+' importierte Buchungen wieder entfernen? Selbst erfasste Buchungen bleiben.')) return;
  state.transaktionen=state.transaktionen.filter(t=>t.importId!==l.id);
  state.einst.letzterImport=null; await saveData(); renderAll(); showMsg('ok','Import entfernt.');
};

/* ---------- Budgetvorschlag aus den echten Ausgaben ---------- */
$('btnVorschlag').onclick=()=>{ $('vorAb').value=Math.floor(YM_HEUTE/100)+'-'+String(YM_HEUTE%100).padStart(2,'0'); vorRender(); $('vorDlg').showModal(); };
$('btnVorClose').onclick=()=>$('vorDlg').close();
$('vorMonate').onchange=vorRender;
function vorMonatsReihe(k,n){
  const a=agg(), out=[], hj=+TODAY.slice(0,4), hm=+TODAY.slice(5,7);
  for(let i=n;i>=1;i--){ const d=new Date(hj,hm-1-i,1);
    out.push(a['Ausgabe|'+d.getFullYear()+'|'+(d.getMonth()+1)+'|'+k.id]||0); }
  return out;
}
function vorRender(){
  const n=+$('vorMonate').value;
  const rows=state.kategorien.filter(k=>k.typ==='Ausgabe').map(k=>{
    const r=vorMonatsReihe(k,n), sum=r.reduce((s,v)=>s+v,0);
    const schnitt=sum/n, med=median(r), v=bVerAkt(k);
    const jahres=v&&v.rhythmus==='J';
    const vorschlag=jahres?Math.ceil(sum/n*12/10)*10:Math.ceil(schnitt/5)*5;
    return {k,sum,schnitt,med,jahres,vorschlag,aktuell:v?+v.budget||0:0,monate:r.filter(x=>x>0).length};
  }).filter(r=>r.sum>0||r.aktuell>0).sort((a,b)=>b.schnitt-a.schnitt);
  $('vorListe').innerHTML='<p class="note">'+n+' Monate ausgewertet. Vorausgewählt sind nur Kategorien ohne Budget. '+
    'Wo sich deine Situation ändert (Miete, Lebensmittel, Nebenkosten nach dem Umzug), taugt die Vergangenheit nicht als Massstab – dort besser selbst schätzen.</p>'+
    rows.map((r,i)=>{
      const abw=r.aktuell?Math.round((r.schnitt*(r.jahres?12:1)/r.aktuell-1)*100):null;
      return '<div class="grpblock"><label class="check" style="margin:0 0 6px"><input type="checkbox" class="vorC" data-i="'+i+'"'+
        (r.aktuell?'':(r.sum>0?' checked':''))+'><b>'+esc(r.k.kategorie)+'</b></label>'+
        '<div class="small">Ø '+fmtCHF(r.schnitt)+'/Mt · Median '+fmtCHF(r.med)+' · in '+r.monate+' von '+n+' Monaten · '+
        'aktuell '+(r.aktuell?fmt0(r.aktuell)+(r.jahres?'/Jahr':'/Mt'):'kein Budget')+
        (abw!==null?' ('+(abw>0?'+':'')+abw+' %)':'')+'</div>'+
        '<div class="btnrow" style="margin-top:6px;flex-wrap:nowrap"><input type="number" step="5" class="vorB" data-i="'+i+'" value="'+r.vorschlag+'" '+
        'style="flex:1;min-width:0;padding:8px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);min-height:40px">'+
        '<span class="small" style="align-self:center;white-space:nowrap">CHF / '+(r.jahres?'Jahr':'Monat')+'</span></div></div>';
    }).join('')||'<p class="small">Noch keine Ausgaben zum Auswerten.</p>';
  $('vorListe').dataset.n=rows.length;
  VOR_ROWS=rows;
}
let VOR_ROWS=[];
$('btnVorUebernehmen').onclick=async()=>{
  const abTxt=$('vorAb').value; const ab=+String(abTxt).replace('-','').slice(0,6);
  if(!(ab>190001)){ showMsg('err','Monat wählen.'); return; }
  let n=0;
  qsa('#vorListe .vorC').forEach(c=>{
    if(!c.checked) return;
    const r=VOR_ROWS[+c.dataset.i]; if(!r) return;
    const betrag=parseFloat($('vorListe').querySelector('.vorB[data-i="'+c.dataset.i+'"]').value)||0;
    const alt=bVerAkt(r.k)||{rhythmus:'M',rollover:0};
    const ver={budget:betrag,rhythmus:r.jahres?'J':'M',rollover:+alt.rollover||0};
    const same=r.k.bh.find(h=>h.ab===ab);
    if(same) Object.assign(same,ver); else r.k.bh.push(Object.assign({ab},ver));
    r.k.bh.sort((a,b)=>a.ab-b.ab); syncAkt(r.k); n++;
  });
  $('vorDlg').close(); await saveData(); renderAll();
  showMsg('ok',n+' Budgets ab '+ymText(ab)+' gesetzt. Frühere Monate bleiben unverändert.');
};

/* ============================= Render / Init ============================= */
function renderAll(){
  aggInvalidate(); ROLLC=null;
  fillKontoSelects(); fillFilter(); fillGK('tx',mode); fillGK('ser',serMode);
  renderFaellig(); renderVorlagen(); renderRecentTx(); renderBudget(); renderKonten(); renderAbos(); renderMuster(); renderPlan();
  renderAnalyse(); renderMehr(); renderImportInfo(); renderZiele(); updateChip();
}
$('txDatum').value=TODAY; $('koDatum').value=TODAY; $('serStart').value=TODAY; $('wDatum').value=TODAY;
/*__PHASE1__*/
/*__PHASE34__*/
/*__PHASE5__*/
calcHint('txBetrag','txCalc'); calcHint('serBetrag','serCalc');
rechnerZeile('txBetrag'); rechnerZeile('serBetrag'); rechnerZeile('planLohn');
// A4: Knoepfe, die speichern, gegen Doppeltippen sperren. Die Handler bleiben, wo sie
// stehen; hier werden sie einmalig umhuellt. Pro Render neu gesetzte Knoepfe (Verbuchen,
// Ueberspringen, Alle verbuchen, Loeschen im Dialog) sind an ihrer Stelle gesperrt.
['btnSaveTx','btnSaveKonto','btnSaveWert','btnSaveZiel','btnSaveSerie','btnSaveTopf',
 'btnSaveCat','btnDelCat','btnSaveGrp','btnDelGrp','btnSaveArt','btnDelArt'].forEach(sperre);
$('txBetrag').addEventListener('input',splitSumme);
fillJahrMonatSelects(); migrate(); $('koTyp').onchange(); setMode('Ausgabe'); setSerMode('Ausgabe');
// Als App installierbar nur, wenn die Seite über https ausgeliefert wird.
$('appVersion').textContent=APP_VERSION;
if(window.isSecureContext && 'serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    SWREG=reg;
    reg.addEventListener('updatefound',()=>{
      const nw=reg.installing; if(!nw) return;
      nw.addEventListener('statechange',()=>{
        if(nw.state==='installed' && navigator.serviceWorker.controller) neueVersion();
      });
    });
    reg.update().catch(()=>{});
  }).catch(()=>{});
  // Beim Zurückkehren in die App prüfen, ob eine neue Fassung bereitliegt
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden && SWREG) SWREG.update().catch(()=>{}); });
} else {
  $('btnUpdate').classList.add('hidden');
  $('updateInfo').textContent='Updates gibt es nur über die installierte Web-App.';
}
function neueVersion(){
  $('updateInfo').innerHTML='<b class="pos">Neue Version bereit.</b> Tippe auf „Jetzt aktualisieren“.';
  $('btnUpdate').textContent='Jetzt aktualisieren';
  $('btnUpdate').classList.add('primary');
  showMsg('ok','Neue Version bereit – unter „Mehr → Daten“ aktualisieren.');
}
$('btnUpdate').onclick=async()=>{
  if($('btnUpdate').textContent==='Jetzt aktualisieren'){ location.reload(true); return; }
  $('updateInfo').textContent='Suche …';
  try{
    if(!SWREG){ location.reload(true); return; }
    await SWREG.update();
    setTimeout(()=>{ if(!/bereit/.test($('updateInfo').textContent))
      $('updateInfo').textContent='Du hast bereits die neuste Version ('+APP_VERSION+').'; },1500);
  }catch(e){ $('updateInfo').textContent='Suche fehlgeschlagen: '+e.message; }
};
renderAll();
tryAutoConnect().then(()=>autoVerbuchen()).catch(e=>{
  updateFileStatus(); showMsg('err','Datenquelle konnte nicht geprüft werden: '+e.message); });
</script>
</body>
</html>
