let state = {kategorien: DEFAULT_KATEGORIEN, konten: DEFAULT_KONTEN, transaktionen: [], vermoegen: [], gruppen: [], meta:{}};
let fileHandle = null;
let editingTxId = null, editingCatId = null;
const FSA = 'showSaveFilePicker' in window;

/* ============================= IndexedDB Handle-Speicher ============================= */
// Auf file:// liefert indexedDB.open() in Chrome weder success noch error zurück und würde
// den Start blockieren. Darum hat jeder Zugriff ein hartes Timeout.
function withTimeout(p, ms, fallback){
  return Promise.race([p, new Promise(res=>setTimeout(()=>res(fallback), ms))]);
}
function idbOpen(){return new Promise((res,rej)=>{
  try{
    if(typeof indexedDB==='undefined'){ rej(new Error('kein IndexedDB')); return; }
    const r=indexedDB.open('finanzapp_db',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('h');
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error||new Error('IndexedDB-Fehler'));
    r.onblocked=()=>rej(new Error('IndexedDB blockiert'));
  }catch(e){ rej(e); }
});}
async function idbSet(k,v){
  const db=await withTimeout(idbOpen(),1500,null); if(!db) return false;
  return withTimeout(new Promise((res,rej)=>{const tx=db.transaction('h','readwrite');
    tx.objectStore('h').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);}),1500,false);
}
async function idbGet(k){
  const db=await withTimeout(idbOpen(),1500,null); if(!db) return undefined;
  return withTimeout(new Promise((res,rej)=>{const tx=db.transaction('h','readonly');
    const rq=tx.objectStore('h').get(k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);}),1500,undefined);
}
// localStorage kann in manchen Kontexten werfen (Privatmodus, blockierte Site-Daten)
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }

let bekannteRev = 0;     // Revision, die dieses Gerät zuletzt gesehen hat
const GERAET = (function(){
  let g = lsGet('finanzapp_geraet');
  if(!g){ g = (navigator.platform||'Gerät').slice(0,12)+'-'+Math.random().toString(36).slice(2,6); lsSet('finanzapp_geraet',g); }
  return g;
})();
let writeState = null;   // null=unbekannt, 'ok'=in Datei gespeichert, 'fail'=Schreiben fehlgeschlagen
let writeErr = '';
let pendingHandle = null; // gespeicherte Datei, die eine Nutzergeste zur Freigabe braucht
// Liefert 'granted' | 'denied' | 'prompt' | 'error:<msg>' statt still false
async function ensurePerm(handle,mode){
  const opts={mode};
  try{
    let s = await handle.queryPermission(opts);
    if(s==='granted') return 'granted';
    s = await handle.requestPermission(opts);
    return s;
  }catch(e){ return 'error:'+(e.name||'')+' '+(e.message||''); }
}
function diag(){
  return 'Browser: '+navigator.userAgent.replace(/^Mozilla\/5\.0 /,'').slice(0,90)+' | FSA: '+FSA;
}

/* ============================= Tolerantes JSON-Lesen ============================= */
// Manche Android-Dateisysteme schneiden beim Überschreiben nicht ab: hinter dem neuen,
// gültigen JSON bleibt dann der Rest der älteren, längeren Fassung stehen. Wir lesen
// das erste vollständige Objekt und melden, wie viel Müll dahinter lag.
function parseTolerant(text){
  try{ return {data:JSON.parse(text), muell:0}; }
  catch(err){
    const t=text.replace(/^﻿/,''), start=t.indexOf('{');
    if(start<0) throw err;
    let depth=0, inStr=false, esc=false;
    for(let i=start;i<t.length;i++){
      const c=t[i];
      if(inStr){ if(esc) esc=false; else if(c==='\\') esc=true; else if(c==='"') inStr=false; continue; }
      if(c==='"') inStr=true;
      else if(c==='{'||c==='[') depth++;
      else if(c==='}'||c===']'){ depth--;
        if(depth===0){
          let data; try{ data=JSON.parse(t.slice(start,i+1)); }catch(e2){ throw err; }
          return {data, muell:t.slice(i+1).trim().length};
        }
      }
    }
    throw err;
  }
}
let LESE_HINWEIS='';

/* ============================= Laden / Speichern ============================= */
// Von migrate() auf true zu setzen, wenn es Daten angelegt hat, die nur aus dem Code stammen
// koennen. loadData() sichert sie dann sofort: migrate() allein schreibt nichts in die Datei.
let MIGRATION_SPEICHERN=false;
async function loadData(){
  try{
    if(fileHandle){
      const file = await fileHandle.getFile();
      const text = await file.text();
      if(text.trim()){ const r=parseTolerant(text); state=r.data;
        if(r.muell) LESE_HINWEIS='Am Dateiende standen '+r.muell+' Zeichen einer älteren Fassung. Sie wurden übergangen, deine Daten sind vollständig. Beim nächsten Speichern verschwinden sie.'; }
      bekannteRev = (state.meta && +state.meta.rev) || 0;
    } else {
      const raw = lsGet('finanzapp_data');
      if(raw) state = JSON.parse(raw);
      bekannteRev = (state.meta && +state.meta.rev) || 0;
    }
  }catch(e){ showMsg('err','Datei konnte nicht gelesen werden: '+e.message); }
  if(!state.kategorien || !state.kategorien.length) state.kategorien = DEFAULT_KATEGORIEN;
  if(!state.konten || !state.konten.length) state.konten = DEFAULT_KONTEN;
  if(!state.transaktionen) state.transaktionen = [];
  if(!state.vermoegen) state.vermoegen = [];
  MIGRATION_SPEICHERN=false;
  migrate();
  updateFileStatus();
  renderAll();
  if(MIGRATION_SPEICHERN){ MIGRATION_SPEICHERN=false; await saveData(); }
  if(LESE_HINWEIS){ const h=LESE_HINWEIS; LESE_HINWEIS=''; setTimeout(()=>showMsg('err',h),80); }
}
// Schreiben in drei Schritten: leeren, schreiben, auf die genaue Länge kürzen.
// Manche Android-Dateisysteme ignorieren einen davon, darum machen wir alle drei.
async function schreibeDatei(handle, json){
  const bytes = new Blob([json]).size;
  const w = await handle.createWritable({keepExistingData:false});
  try{ await w.truncate(0); }catch(e){}
  await w.write(json);
  try{ await w.truncate(bytes); }catch(e){}
  await w.close();
}
// Gegenprobe über die Revisionsnummer statt über die Zeichenzahl. Nur so lässt
// sich ein veralteter Lesezugriff von einem echten Schreibfehler unterscheiden:
// Android gibt direkt nach dem Schreiben oft noch die vorige Fassung zurück.
async function bestaetigeSchreiben(handle, rev){
  let grund='';
  for(let versuch=0; versuch<3; versuch++){
    if(versuch) await new Promise(r=>setTimeout(r, versuch*250));
    let txt;
    try{ txt = await (await handle.getFile()).text(); }
    catch(e){ grund='nicht lesbar: '+e.message; continue; }
    let gelesen;
    try{ gelesen = parseTolerant(txt); }
    catch(e){ grund='Datei nicht lesbar'; continue; }
    const grev = (gelesen.data && gelesen.data.meta && +gelesen.data.meta.rev) || 0;
    if(grev === rev) return {ok:true, muell:gelesen.muell};
    if(grev > rev) return {ok:false, grund:'fremder Stand '+grev};
    grund='noch alter Stand '+grev;
  }
  return {ok:false, unbestaetigt:true, grund};
}
async function saveData(){
  if(fileHandle){
    // Prüfen, ob ein anderes Gerät die Datei inzwischen geändert hat.
    try{
      const alt = await fileHandle.getFile();
      const txt = await alt.text();
      if(txt.trim()){
        const fremd = parseTolerant(txt).data;
        const frev = (fremd.meta && +fremd.meta.rev) || 0;
        if(frev > bekannteRev){
          const wann = fremd.meta && fremd.meta.letzteAenderung ? new Date(fremd.meta.letzteAenderung).toLocaleString('de-CH') : 'unbekannt';
          const wer = (fremd.meta && fremd.meta.geraet) || 'anderes Gerät';
          const ok = confirm('Achtung: Die Datei wurde zwischenzeitlich geändert.\n\nvon: '+wer+'\nam: '+wann+
            '\n\nOK = deine Änderungen schreiben und die fremden verwerfen.\nAbbrechen = nicht speichern, danach "Neu laden" drücken.');
          if(!ok){
            showMsg('err','Nicht gespeichert. Drücke „Neu laden“, um den Stand des anderen Geräts zu holen.');
            writeState='fail'; writeErr='Konflikt mit '+wer; updateFileStatus(); return;
          }
          bekannteRev = frev;
        }
      }
    }catch(e){ /* Datei nicht lesbar: unten greift die normale Fehlerbehandlung */ }
  }
  state.meta = {letzteAenderung: new Date().toISOString(), rev: bekannteRev+1, geraet: GERAET};
  const json = JSON.stringify(state, null, 2);
  if(fileHandle){
    lsSet('finanzapp_data',json); // lokale Sicherheitskopie
    const p = await ensurePerm(fileHandle,'readwrite');
    if(p==='granted'){
      try{
        await schreibeDatei(fileHandle, json);
        const pruef = await bestaetigeSchreiben(fileHandle, state.meta.rev);
        if(pruef.ok){
          writeState='ok'; writeErr=''; bekannteRev = state.meta.rev;
          if(pruef.muell) showMsg('err','Gespeichert. Das Dateisystem hat '+pruef.muell+
            ' Zeichen der alten Fassung stehen lassen. Die App liest darüber hinweg; beim nächsten Speichern verschwinden sie.');
        } else if(pruef.unbestaetigt){
          // Android liefert direkt nach dem Schreiben oft noch den alten Stand.
          // Geschrieben ist trotzdem, darum kein Fehler, nur ein stiller Vermerk.
          writeState='ok'; writeErr='Bestätigung ausstehend'; bekannteRev = state.meta.rev;
        } else {
          writeState='fail'; writeErr=pruef.grund||'unbekannt';
          showMsg('err','In der Datei steht ein anderer Stand ('+writeErr+'). Drücke „Neu laden“ oder sichere mit „JSON sichern“.');
        }
      }catch(e){ writeState='fail'; writeErr=(e.name||'')+' '+(e.message||''); showMsg('err','NICHT in Datei gespeichert: '+writeErr+' – nutze "JSON sichern".'); }
    } else { writeState='fail'; writeErr='Schreibrecht: '+p; showMsg('err','NICHT in Datei gespeichert ('+p+'). "Datei wieder verbinden" oder "JSON sichern" nutzen.'); }
  } else {
    bekannteRev = state.meta.rev;
    if(!lsSet('finanzapp_data', json)){
      showMsg('err','Speichern fehlgeschlagen – dieser Browser blockiert lokale Daten. Verbinde eine Datei oder exportiere als CSV.');
    }
  }
  updateFileStatus();
}
function updateFileStatus(){
  try{ updateChip(); }catch(e){}
  try{ updateBanner(); }catch(e){}
  const el = document.getElementById('fileStatus');
  const zeit = state.meta && state.meta.letzteAenderung ? new Date(state.meta.letzteAenderung).toLocaleString('de-CH') : '–';
  const rb = document.getElementById('btnReconnect');
  if(rb) rb.classList.toggle('hidden', !pendingHandle && writeState!=='fail');
  if(fileHandle && writeState==='fail'){
    el.textContent = '⚠ Datei "'+fileHandle.name+'" gelesen, aber SCHREIBEN FEHLGESCHLAGEN ('+writeErr+'). Änderungen nur lokal! · '+diag();
  } else if(fileHandle){
    el.textContent = 'Verbunden mit Datei "'+fileHandle.name+'"'+(writeState==='ok'?' · zuletzt in Datei gespeichert '+zeit:' · Schreiben noch ungetestet');
  } else if(pendingHandle){
    el.textContent = 'Datei "'+pendingHandle.name+'" bekannt, aber Freigabe fehlt – "Datei wieder verbinden" tippen. Bis dahin lokale Daten (evtl. veraltet).';
  } else if(FSA){
    el.textContent = 'Keine Datei verbunden – Daten liegen nur lokal in diesem Browser. "Neue Datei erstellen" für Sync über OneDrive.';
  } else {
    el.textContent = 'Dieser Browser unterstützt kein Datei-Verbinden – Daten liegen lokal in diesem Browser. Nutze CSV Export/Import zum Übertragen.';
  }
}
// Banner statt Suchen: Android entzieht die Freigabe bei jedem App-Start.
function updateBanner(){
  const b=document.getElementById('connBanner'); if(!b) return;
  const zeigen = !!pendingHandle || (fileHandle && writeState==='fail');
  b.classList.toggle('hidden', !zeigen);
  if(!zeigen) return;
  const name=(pendingHandle||fileHandle).name;
  document.getElementById('connText').textContent = pendingHandle
    ? 'Android hat die Freigabe für „'+name+'“ beim Neustart vergessen. Bis zum Verbinden siehst du den zuletzt lokal gesicherten Stand.'
    : 'Schreiben in „'+name+'“ ist fehlgeschlagen. Neu verbinden, damit deine Änderungen in die Datei kommen.';
}
function showMsg(type,text){
  let m = document.getElementById('toastMsg');
  if(!m){ m=document.createElement('div'); m.id='toastMsg'; m.style.position='fixed'; m.style.bottom='80px';
    m.style.left='16px'; m.style.right='16px'; m.style.zIndex=20; document.body.appendChild(m); }
  m.innerHTML = '<div class="msg '+type+'">'+text+'</div>';
  setTimeout(()=>{ if(m) m.innerHTML=''; }, 7000);
}

document.getElementById('btnConnNow').onclick = ()=>{
  const rb=document.getElementById('btnReconnect');
  if(rb) rb.click();
};
document.getElementById('btnNewFile').onclick = async ()=>{
  if(!FSA){ showMsg('err','Dieser Browser unterstützt das nicht.'); return; }
  try{
    const handle = await window.showSaveFilePicker({suggestedName:'finanzdaten.json',
      types:[{description:'Finanz-Tracker Daten', accept:{'application/json':['.json']}}]});
    await idbSet('datafile', handle);
    fileHandle = handle;
    await saveData();
    showMsg('ok','Datei verbunden.');
  }catch(e){ if(e.name!=='AbortError') showMsg('err',e.message); }
};
document.getElementById('btnOpenFile').onclick = async ()=>{
  if(!FSA){ showMsg('err','Dieser Browser unterstützt das nicht.'); return; }
  try{
    const [handle] = await window.showOpenFilePicker({types:[{description:'Finanz-Tracker Daten', accept:{'application/json':['.json']}}]});
    // 1) Erst nur lesen – das geht fast immer
    const pr = await ensurePerm(handle,'read');
    if(pr!=='granted'){ showMsg('err','Lesen verweigert ('+pr+'). '+diag()+' → "JSON laden" nutzen.'); return; }
    // 2) Dann Schreibrecht testen; bei Ablehnung trotzdem laden, aber klar kennzeichnen
    const wr = await ensurePerm(handle,'readwrite');
    fileHandle = handle; pendingHandle = null;
    if(wr==='granted'){ writeState=null; writeErr=''; await idbSet('datafile', handle); }
    else { writeState='fail'; writeErr='Schreibrecht: '+wr; }
    await loadData();
    showMsg(wr==='granted'?'ok':'err', wr==='granted'?'Datei geöffnet.':'Datei nur lesbar geladen ('+wr+'). Änderungen werden nicht in die Datei geschrieben.');
  }catch(e){ if(e.name!=='AbortError') showMsg('err',(e.name||'')+' '+e.message+' | '+diag()); }
};
document.getElementById('btnReconnect').onclick = async ()=>{
  const h = pendingHandle || fileHandle;
  if(!h){ showMsg('err','Keine Datei bekannt.'); return; }
  const p = await ensurePerm(h,'readwrite');
  if(p==='granted'){ fileHandle=h; pendingHandle=null; writeState=null; writeErr=''; await loadData(); showMsg('ok','Wieder verbunden.'); }
  else { showMsg('err','Freigabe nicht erteilt ('+p+'). '+diag()); }
};
// Browser-unabhängiger Fallback: normale Datei laden / herunterladen
document.getElementById('btnJsonSave').onclick = ()=>{
  state.meta = {letzteAenderung: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'finanzdaten.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  showMsg('ok','JSON heruntergeladen – in OneDrive/Downloads ablegen.');
};
document.getElementById('btnJsonLoad').onclick = ()=>document.getElementById('jsonFileIn').click();
document.getElementById('jsonFileIn').onchange = async (ev)=>{
  const f = ev.target.files[0]; if(!f) return;
  try{
    const pr = parseTolerant(await f.text()), s = pr.data;
    if(!Array.isArray(s.transaktionen) || !Array.isArray(s.kategorien)) throw new Error('keine gültige Finanz-Tracker-Datei');
    const neuRev=(s.meta&&+s.meta.rev)||0;
    const alt = neuRev && bekannteRev && neuRev < bekannteRev;
    const wann = s.meta&&s.meta.letzteAenderung ? new Date(s.meta.letzteAenderung).toLocaleString('de-CH') : 'unbekannt';
    if(!confirm((alt?'ACHTUNG: Diese Datei ist ÄLTER als dein aktueller Stand. Du verlierst neuere Buchungen.\n\n':'')+
      'Stand der Datei: '+wann+' ('+s.transaktionen.length+' Buchungen)\nDein aktueller Stand: '+state.transaktionen.length+' Buchungen'+
      '\n\nAktuelle Daten wirklich ersetzen?')) return;
    bekannteRev = neuRev;
    state = s; fileHandle = null; writeState = null;
    if(!state.konten||!state.konten.length) state.konten = DEFAULT_KONTEN;
    if(!state.vermoegen) state.vermoegen = [];
    lsSet('finanzapp_data', JSON.stringify(state));
    migrate(); updateFileStatus(); renderAll(); showMsg('ok','JSON geladen ('+state.transaktionen.length+' Buchungen).'+(pr.muell?' Achtung: '+pr.muell+' Zeichen Restmüll am Dateiende ignoriert; beim nächsten Speichern ist die Datei wieder sauber.':''));
  }catch(e){ showMsg('err','JSON-Fehler: '+e.message); }
  ev.target.value='';
};
document.getElementById('btnReload').onclick = async ()=>{ await loadData(); showMsg('ok','Neu geladen.'); };

async function tryAutoConnect(){
  if(!FSA){ await loadData(); return; }
  try{
    const handle = await idbGet('datafile');
    if(handle){
      let s = 'prompt';
      try{ s = await handle.queryPermission({mode:'readwrite'}); }catch(e){}
      if(s==='granted'){ fileHandle = handle; } else { pendingHandle = handle; }
    }
  }catch(e){}
  await loadData();
}

