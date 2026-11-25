/* Orientate — app principal */
(function(){
'use strict';
const D = window.DATA, LECC = window.LECCIONES;
const $ = s => document.querySelector(s);
const panel = $('#panel');
const rnd = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- progreso (localStorage, con red de seguridad) ---------- */
const KEY='orientate_v1';
let P = {xp:0, lecc:{}, best:{}, err:{}};
try{ const s=JSON.parse(localStorage.getItem(KEY)); if(s) P=Object.assign(P,s); }catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(P)); }catch(e){} $('#xp').textContent=P.xp; }
save();
function addErr(k,d){ P.err[k]=Math.max(0,(P.err[k]||0)+d); }
// elige ítems priorizando los que más erraste
function pickWeighted(items, keyFn){
  const w = items.map(it => 1 + 3*(P.err[keyFn(it)]||0));
  let t = w.reduce((a,b)=>a+b,0), r=Math.random()*t;
  for(let i=0;i<items.length;i++){ r-=w[i]; if(r<=0) return items[i]; }
  return items[items.length-1];
}

/* ---------- datos derivados ---------- */
const BARRIOS = D.barrios.features;
const BYB = Object.fromEntries(BARRIOS.map(f=>[f.properties.nombre,f]));
const AVS = D.avenidas.features;
const BYAV = Object.fromEntries(AVS.map(f=>[f.properties.nombre,f]));
const LINEAS = D.subte;
const LBYID = Object.fromEntries(LINEAS.map(l=>[l.id,l]));
const nameCount = {};
LINEAS.forEach(l=>l.estaciones.forEach(s=>{ nameCount[s.n]=(nameCount[s.n]||0)+1; }));
const ESTACIONES = [];
LINEAS.forEach(l=>l.estaciones.forEach((s,i)=>ESTACIONES.push(Object.assign({linea:l.id,idx:i},s))));
const PARES = [ // verificados: norte / sur de Rivadavia
 ['San Martín','Bolívar'],['Florida','Perú'],['Maipú','Chacabuco'],['Esmeralda','Piedras'],['Suipacha','Tacuarí'],
 ['Carlos Pellegrini','Bernardo de Irigoyen'],['Cerrito','Lima'],['Libertad','Salta'],['Talcahuano','Santiago del Estero'],
 ['Montevideo','Virrey Cevallos'],['Callao','Entre Ríos'],['Pueyrredón','Jujuy']];
const ZONA = {};
'Retiro,San Nicolás,Monserrat,San Telmo,Puerto Madero,Constitución'.split(',').forEach(b=>ZONA[b]='centro');
'Recoleta,Palermo,Colegiales,Belgrano,Núñez,Saavedra,Coghlan,Villa Urquiza,Villa Ortúzar,Chacarita,Parque Chas,Villa Pueyrredón,Agronomía'.split(',').forEach(b=>ZONA[b]='norte');
'La Boca,Barracas,Parque Patricios,Nueva Pompeya,Villa Soldati,Villa Lugano,Villa Riachuelo,Parque Avellaneda,Mataderos'.split(',').forEach(b=>ZONA[b]='sur');
const ZCOL={centro:'#fca311',norte:'#2a9d8f',sur:'#e76f51',oeste:'#5c7cfa'};
const zonaDe = b => ZONA[b]||'oeste';

/* ---------- mapa ---------- */
const map = L.map('map',{zoomSnap:.25,minZoom:11,maxBounds:[[-34.76,-58.62],[-34.48,-58.28]]}).setView([-34.615,-58.445],12);
const attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const tilesNo = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',{attribution:attr,subdomains:'abcd',maxZoom:18});
const tilesSi = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:attr,subdomains:'abcd',maxZoom:18});
tilesNo.addTo(map);
function etiquetasCalles(on){ if(on){map.removeLayer(tilesNo);tilesSi.addTo(map);} else {map.removeLayer(tilesSi);tilesNo.addTo(map);} }

const limite = L.geoJSON(D.limite,{style:{color:'#14213d',weight:2.5,fill:false},interactive:false}).addTo(map);
let onBarrioClick=null, onAvClick=null, onMapClick=null, onStClick=null;
const barStyleBase = f => ({color:'#888',weight:1,fillColor:ZCOL[zonaDe(f.properties.nombre)],fillOpacity:.12});
const barriosL = L.geoJSON(D.barrios,{style:barStyleBase,onEachFeature:(f,l)=>{
  l.on('click',e=>{ if(onBarrioClick){ L.DomEvent.stopPropagation(e); onBarrioClick(f,e); } });
  l.on('mouseover',()=>{ if(barHover) l.setStyle({fillOpacity:.3}); });
  l.on('mouseout',()=>{ if(barHover) barriosL.resetStyle(l); });
}});
let barHover=true;
const barLabels = L.layerGroup(BARRIOS.map(f=>L.marker([f.properties.lat,f.properties.lon],{opacity:0,interactive:false}).bindTooltip(f.properties.nombre,{permanent:true,direction:'center',className:'lbl'})));
const avStyle = f => ({color:f.properties.reinicia?'#8a5a00':'#333',weight:f.properties.nivel===1?3:1.8,opacity:.75});
const avL = L.geoJSON(D.avenidas,{style:avStyle,interactive:false});
const avHit = L.geoJSON(D.avenidas,{style:{weight:16,opacity:0},onEachFeature:(f,l)=>{
  l.on('click',e=>{ if(onAvClick){ L.DomEvent.stopPropagation(e); onAvClick(f,e);} });
  l.bindTooltip(f.properties.nombre,{sticky:true});
}});
const subteL = L.layerGroup();
const stMarkers = L.layerGroup();
LINEAS.forEach(l=>{
  L.polyline(l.estaciones.map(s=>[s.lat,s.lon]),{color:l.color,weight:5,opacity:.85}).addTo(subteL);
  l.estaciones.forEach((s,i)=>{
    const m=L.circleMarker([s.lat,s.lon],{radius:5,color:'#fff',weight:2,fillColor:l.color,fillOpacity:1});
    m.bindTooltip(`<span class="st-tip">${esc(s.n)}</span> · línea ${l.id}`);
    m.on('click',e=>{ if(onStClick){L.DomEvent.stopPropagation(e); onStClick(l,s,i);} });
    m.addTo(stMarkers);
  });
});
const hl = L.layerGroup().addTo(map);
map.on('click',e=>{ if(onMapClick) onMapClick(e); });

function layers(o){
  [[barriosL,o.barrios],[barLabels,o.labels],[avL,o.av],[avHit,o.avhit],[subteL,o.subte],[stMarkers,o.est]].forEach(([l,on])=>{
    if(on && !map.hasLayer(l)) l.addTo(map); if(!on && map.hasLayer(l)) map.removeLayer(l);
  });
  if(map.hasLayer(avL)) avL.bringToFront();
  if(map.hasLayer(subteL)) subteL.eachLayer(x=>x.bringToFront&&x.bringToFront());
}
function clearHandlers(){ onBarrioClick=onAvClick=onMapClick=onStClick=null; }
function hint(t){ const h=$('#maphint'); if(t){h.textContent=t;h.classList.remove('hidden');} else h.classList.add('hidden'); }
function hlAv(name,color,w,label){
  const f=BYAV[name]; if(!f) return;
  const g=L.geoJSON(f,{style:{color:color||'#d00000',weight:w||6,opacity:.95},interactive:false}).addTo(hl);
  if(label){ const c=midOf(f); L.marker(c,{opacity:0,interactive:false}).bindTooltip(name,{permanent:true,direction:'top',className:'lbl'}).addTo(hl); }
  return g;
}
function hlBarrio(name,color,fill){
  return L.geoJSON(BYB[name],{style:{color:color||'#d00000',weight:3,fillColor:color||'#d00000',fillOpacity:fill==null?.35:fill},interactive:false}).addTo(hl);
}
function label(latlng,text,cls){ L.marker(latlng,{opacity:0,interactive:false}).bindTooltip(text,{permanent:true,direction:'center',className:cls||'lbl'}).addTo(hl); }
function midOf(f){
  const lines = f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
  const longest = lines.reduce((a,b)=>b.length>a.length?b:a);
  const p = longest[Math.floor(longest.length/2)]; return [p[1],p[0]];
}
// distancia (m) de un punto a una geometría lineal
function distToLine(latlng,f){
  const k=Math.cos(latlng.lat*Math.PI/180)*111320, kk=110540;
  const px=latlng.lng*k, py=latlng.lat*kk; let best=Infinity;
  const lines = f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
  lines.forEach(ln=>{ for(let i=0;i<ln.length-1;i++){
    const ax=ln[i][0]*k, ay=ln[i][1]*kk, bx=ln[i+1][0]*k, by=ln[i+1][1]*kk;
    const dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy; let t=L2?((px-ax)*dx+(py-ay)*dy)/L2:0; t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(px-(ax+t*dx),py-(ay+t*dy)); if(d<best) best=d; }});
  return best;
}
const fitCABA = () => map.flyToBounds(limite.getBounds(),{padding:[10,10],duration:.6});
setTimeout(()=>map.invalidateSize(),50);
window.addEventListener('resize',()=>map.invalidateSize());

const avTitulo = p => p.calle||p.nombre.startsWith('Av.') ? p.nombre : 'Av. '+p.nombre;
/* ---------- tabs ---------- */
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>go(b.dataset.tab));
function go(tab){
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  clearHandlers(); hl.clearLayers(); hint(null); etiquetasCalles(false); barHover=true; barriosL.resetStyle();
  ({aprender:viewAprender, explorar:viewExplorar, jugar:viewJugar})[tab]();
  panel.scrollTop=0;
}

/* ---------- APRENDER ---------- */
function viewAprender(){
  layers({barrios:true,labels:false,av:true,subte:false});
  const hechas = LECC.filter(l=>P.lecc[l.id]).length;
  panel.innerHTML = `<h1>Aprendé la lógica de la ciudad</h1>
  <p class="mute">12 lecciones cortas. Tocá una y mirá el mapa. Después, a jugar.</p>
  <div class="bar"><i style="width:${hechas/LECC.length*100}%"></i></div>
  <p class="mute">${hechas} de ${LECC.length} leídas</p>
  ${LECC.map(l=>`<div class="card lesson ${P.lecc[l.id]?'done':''}" data-id="${l.id}"><h3>${l.emoji} ${l.titulo}</h3><div class="lesson-body hidden">${l.html}
  <div class="row"><button class="btn small" data-entendido="${l.id}">Entendido ✓</button></div></div></div>`).join('')}`;
  panel.querySelectorAll('.lesson').forEach(c=>c.onclick=e=>{
    const id=c.dataset.id;
    if(e.target.dataset.entendido){ if(!P.lecc[id]){P.lecc[id]=1;P.xp+=5;save();} c.classList.add('done'); c.querySelector('.lesson-body').classList.add('hidden'); e.stopPropagation(); return; }
    const body=c.querySelector('.lesson-body'); const open=body.classList.contains('hidden');
    panel.querySelectorAll('.lesson-body').forEach(b=>b.classList.add('hidden'));
    if(open){ body.classList.remove('hidden'); accion(LECC.find(l=>l.id===id).accion); }
  });
  fitCABA();
}
function accion(a){
  hl.clearLayers(); layers({barrios:true,labels:false,av:true,subte:false});
  if(a==='bordes'){
    hlAv('General Paz','#d00000',6,true);
    label([-34.575,-58.355],'Río de la Plata 🌊 (ESTE)');
    label([-34.668,-58.405],'Riachuelo (SUR)');
    fitCABA();
  } else if(a==='rivadavia'){
    hlAv('Rivadavia','#d00000',7,true); hlAv('9 de Julio','#0b6bcb',5,true); hlAv('General Paz','#0b6bcb',5,false);
    label([-34.585,-58.46],'⬆ NORTE'); label([-34.655,-58.46],'⬇ SUR'); fitCABA();
  } else if(a==='numeracion'){
    hlAv('Corrientes','#d00000',6,true); hlAv('Pueyrredón','#0b6bcb',6,true); hlAv('Jujuy','#0b6bcb',6,true); hlAv('Rivadavia','#999',5,false);
    label([-34.6035,-58.366],'Corrientes 0 ⟵ río'); label([-34.6035,-58.440],'⟵ crece hacia el oeste');
    label([-34.6085,-58.4095],'0 ▸ Rivadavia'); label([-34.592,-58.4095],'⬆ crece'); label([-34.632,-58.4095],'⬇ crece');
    map.flyToBounds([[-34.64,-58.45],[-34.585,-58.36]],{duration:.6});
  } else if(a==='pares'){
    hlAv('Rivadavia','#999',6,false);
    ['Callao','Pueyrredón'].forEach(n=>hlAv(n,'#0b6bcb',6,true)); ['Entre Ríos','Jujuy'].forEach(n=>hlAv(n,'#d00000',6,true));
    map.flyToBounds([[-34.635,-58.415],[-34.585,-58.37]],{duration:.6});
  } else if(a==='reinicia'){
    AVS.filter(f=>f.properties.reinicia).forEach(f=>hlAv(f.properties.nombre,'#d00000',6,true));
    map.flyToBounds([[-34.625,-58.47],[-34.555,-58.37]],{duration:.6});
  } else if(a==='nivel1'){
    AVS.filter(f=>f.properties.nivel===1).forEach(f=>hlAv(f.properties.nombre,f.properties.sentido==='este-oeste'?'#d00000':f.properties.sentido==='norte-sur'?'#0b6bcb':'#2a9d8f',5,true));
    map.flyToBounds([[-34.64,-58.47],[-34.56,-58.36]],{duration:.6});
  } else if(a==='subte'){
    layers({barrios:true,av:false,subte:true,est:true});
    LINEAS.forEach(l=>{ const s=l.estaciones[l.estaciones.length-1]; label([s.lat,s.lon],'Línea '+l.id); });
    map.flyToBounds([[-34.645,-58.49],[-34.55,-58.36]],{duration:.6});
  } else if(a==='barranca'){
    hlAv('Leandro N. Alem','#8a5a00',7,true); hlAv('Paseo Colón','#8a5a00',7,true); hlBarrio('Puerto Madero','#0b6bcb',.25);
    L.circleMarker([-34.5953,-58.3753],{radius:9,color:'#2a9d8f',fillOpacity:.8}).addTo(hl).bindTooltip('Plaza San Martín (arriba de la barranca)',{permanent:true,direction:'left'});
    L.circleMarker([-34.6287,-58.3696],{radius:9,color:'#2a9d8f',fillOpacity:.8}).addTo(hl).bindTooltip('Parque Lezama (arriba de la barranca)',{permanent:true,direction:'left'});
    map.flyToBounds([[-34.635,-58.39],[-34.588,-58.355]],{duration:.6});
  } else if(a==='barrios'){
    layers({barrios:true,labels:true,av:false,subte:false}); fitCABA();
  }
}

/* ---------- EXPLORAR ---------- */
function viewExplorar(){
  const st={barrios:true,labels:true,av:true,avhit:true,subte:true,est:true,calles:false};
  function apply(){ layers(st); etiquetasCalles(st.calles); }
  apply(); fitCABA();
  panel.innerHTML = `<h1>Explorá</h1><p class="mute">Tocá un barrio, una avenida o una estación. Activá y desactivá capas para mirar el mapa "desnudo".</p>
  <div class="card toggles">
  ${[['barrios','Barrios'],['labels','Nombres de barrios'],['av','Avenidas principales'],['subte','Líneas de subte'],['est','Estaciones'],['calles','Todas las calles (mapa base con nombres)']].map(([k,t])=>`<label><input type="checkbox" data-k="${k}" ${st[k]?'checked':''}> ${t}</label>`).join('')}
  </div>
  <div class="legend">${Object.entries(ZCOL).map(([z,c])=>`<span class="pill" style="background:${c}33;border:1px solid ${c}">${z}</span>`).join('')}</div>
  <div id="info" class="card info"><p class="mute">Elegí algo en el mapa…</p></div>`;
  panel.querySelectorAll('input[data-k]').forEach(i=>i.onchange=()=>{ st[i.dataset.k]=i.checked; if(i.dataset.k==='av') st.avhit=i.checked; apply(); });
  const info=$('#info');
  onBarrioClick=f=>{
    hl.clearLayers(); hlBarrio(f.properties.nombre,'#d00000',.25);
    const p=f.properties;
    info.innerHTML=`<h3>${esc(p.nombre)}</h3><p class="mute">Comuna ${p.comuna} · zona ${zonaDe(p.nombre)} · ${p.km2} km²</p>
    <p><b>¿Por qué se llama así?</b> ${esc(p.origen)}</p><p><b>Limita con:</b> ${p.vecinos.map(esc).join(', ')}</p>`;
  };
  onAvClick=f=>{
    hl.clearLayers(); hlAv(f.properties.nombre,'#d00000',7,false); const p=f.properties;
    info.innerHTML=`<h3>${esc(avTitulo(p))}</h3><p class="mute">Sentido general: ${p.sentido}${p.subte?` · subte: ${esc(p.subte)}`:''}</p><p>${esc(p.info)}</p>`;
  };
  onStClick=(l,s,i)=>{
    const prev=l.estaciones[i-1], next=l.estaciones[i+1];
    const comb=ESTACIONES.filter(e=>e.linea!==l.id && Math.hypot((e.lat-s.lat)*111,(e.lon-s.lon)*92)<0.35);
    info.innerHTML=`<h3>${esc(s.n)} <span class="pill" style="background:${l.color};color:${l.texto}">${l.id}</span></h3>
    <p class="mute">Línea ${l.id}: ${esc(l.bajo)}</p>
    <p>${prev?`⬅ ${esc(prev.n)}`:'Cabecera'} &nbsp;·&nbsp; ${next?`${esc(next.n)} ➡`:'Cabecera'}</p>
    ${comb.length?`<p><b>Combina / está cerca de:</b> ${comb.map(c=>`${esc(c.n)} (${c.linea})`).join(', ')}</p>`:''}`;
  };
}

/* ---------- JUGAR ---------- */
const GAMES = [
 {id:'b_donde', t:'📍 ¿Dónde queda el barrio?', d:'Te digo un barrio, lo tocás en el mapa.', gen:qBarrioDonde},
 {id:'b_cual', t:'🏘️ ¿Qué barrio es?', d:'Se pinta un barrio, elegí el nombre.', gen:qBarrioCual},
 {id:'b_vec', t:'🤝 Vecinos', d:'¿Cuál limita con…? Armá el rompecabezas.', gen:qVecinos},
 {id:'a_cual', t:'🛣️ ¿Qué avenida es?', d:'Se marca una avenida, decí cuál es.', gen:qAvCual},
 {id:'a_donde', t:'✏️ Encontrá la avenida', d:'Tocá la avenida en el mapa vacío.', gen:qAvDonde},
 {id:'s_linea', t:'🚇 ¿De qué línea es?', d:'Una estación, seis líneas.', gen:qSubteLinea},
 {id:'s_donde', t:'🎯 Ubicá la estación', d:'Tocá dónde queda la estación.', gen:qSubteDonde},
 {id:'s_sig', t:'➡️ Próxima estación', d:'¿Qué estación viene después?', gen:qSubteSig},
 {id:'n_riv', t:'🔀 Piedras en Esmeralda', d:'Calles que cambian de nombre en Rivadavia.', gen:qNombres},
 {id:'n_num', t:'🔢 Números y veredas', d:'Cuadras, alturas y pares/impares.', gen:qNumeros},
 {id:'o_ori', t:'🧭 Orientación', d:'Río, sol, barranca y reglas.', gen:qOrientacion},
 {id:'mix', t:'🏆 Desafío porteño', d:'Mezcla de todo. ¿Cuánto sabés?', gen:()=>rnd(GAMES.filter(g=>g.id!=='mix')).gen()},
];
function viewJugar(){
  layers({barrios:true,labels:false,av:false,subte:false}); fitCABA();
  panel.innerHTML=`<h1>Minijuegos</h1><p class="mute">Rondas de 10 preguntas. Lo que errás vuelve más seguido hasta que lo aprendas.</p>
  <div class="grid">${GAMES.map(g=>`<button class="game" data-g="${g.id}"><b>${g.t}</b><span>${g.d}</span>${P.best[g.id]!=null?`<span class="best">Récord: ${P.best[g.id]}/10</span>`:''}</button>`).join('')}</div>
  <p class="mute" style="margin-top:16px">Tus puntos y récords se guardan en este navegador.</p>`;
  panel.querySelectorAll('.game').forEach(b=>b.onclick=()=>startGame(GAMES.find(g=>g.id===b.dataset.g)));
}
let G=null;
function startGame(game){ G={game,n:0,ok:0,streak:0,last:null}; nextQ(); }
function nextQ(){
  clearHandlers(); hl.clearLayers(); hint(null); barriosL.resetStyle();
  if(G.n>=10) return endGame();
  let q, tries=0; do{ q=G.game.gen(); tries++; }while(q.key && q.key===G.last && tries<5);
  G.last=q.key; G.q=q; G.n++;
  panel.innerHTML=`<div class="row"><button class="btn sec small" id="salir">← Juegos</button><b style="margin-left:auto">${G.game.t}</b></div>
  <div class="score"><span>Pregunta <b>${G.n}</b>/10</span><span>Aciertos <b>${G.ok}</b></span><span>Racha <b>${G.streak}</b>🔥</span></div>
  <div class="bar"><i style="width:${(G.n-1)*10}%"></i></div>
  <div class="q">${q.prompt}</div><div class="opts" id="opts"></div><div id="fb"></div>`;
  $('#salir').onclick=()=>go('jugar');
  q.setup && q.setup();
  if(q.options){
    const box=$('#opts');
    q.options.forEach(o=>{ const b=document.createElement('button'); b.className='opt'; b.innerHTML=o.html||esc(o); b.onclick=()=>{
      if(G.answered) return; const val=o.val!=null?o.val:o; const good = val===q.answer;
      box.querySelectorAll('.opt').forEach(x=>{ const v=x._val; if(v===q.answer) x.classList.add('ok'); });
      if(!good) b.classList.add('bad');
      resolve(good);
    }; b._val=o.val!=null?o.val:o; box.appendChild(b); });
  } else { hint(q.mapHint||'Tocá en el mapa'); }
  G.answered=false;
}
function resolve(good, extra){
  if(G.answered) return; G.answered=true; clearHandlers(); hint(null);
  const q=G.q;
  if(good){ G.ok++; G.streak++; P.xp+=10+Math.min(G.streak-1,5)*2; if(q.key) addErr(q.key,-1); }
  else { G.streak=0; if(q.key) addErr(q.key,+1); }
  save();
  q.reveal && q.reveal(good);
  $('#fb').innerHTML=`<div class="feedback ${good?'ok':'bad'}"><b>${good?rnd(['¡Bien ahí!','¡Exacto!','¡Crack!','¡Eso!']):rnd(['No era esa.','Casi…','Uh, no.'])}</b> ${extra||''} ${q.explain||''}</div>
  <div class="row" style="margin-top:10px"><button class="btn" id="sig">${G.n>=10?'Ver resultado':'Siguiente →'}</button></div>`;
  $('#sig').onclick=nextQ; $('#sig').focus();
}
function endGame(){
  const prev=P.best[G.game.id]; if(prev==null||G.ok>prev) P.best[G.game.id]=G.ok; save();
  hl.clearLayers(); layers({barrios:true,labels:true,av:false,subte:false}); fitCABA();
  const msg = G.ok>=9?'Nivel taxista. 🚕':G.ok>=7?'Muy bien, ya te movés solo.':G.ok>=4?'Vas armando el mapa. Otra ronda.':'Tranqui: repasá la lección y volvé.';
  panel.innerHTML=`<h1>${G.ok}/10</h1><p>${msg}</p>${prev!=null&&G.ok>prev?'<p><b>¡Nuevo récord!</b></p>':''}
  <div class="row"><button class="btn" id="otra">Otra ronda</button><button class="btn sec" id="vol">Volver a juegos</button></div>`;
  $('#otra').onclick=()=>startGame(G.game); $('#vol').onclick=()=>go('jugar');
}
const opts = (correct, pool, n=4) => shuffle([correct, ...shuffle(pool.filter(x=>x!==correct)).slice(0,n-1)]);

/* --- preguntas: barrios --- */
function barrioExplain(n){ const p=BYB[n].properties; return `<br><b>${esc(n)}</b>: ${esc(p.origen)}<br><span class="mute">Limita con ${p.vecinos.map(esc).join(', ')}.</span>`; }
function qBarrioDonde(){
  const f=pickWeighted(BARRIOS,f=>'b:'+f.properties.nombre), n=f.properties.nombre;
  return {key:'b:'+n, prompt:`Tocá <u>${esc(n)}</u> en el mapa`, mapHint:`¿Dónde queda ${n}?`,
    setup(){ layers({barrios:true,labels:false,av:false,subte:false}); barHover=true; fitCABA();
      onBarrioClick=(g)=>{ const ok=g.properties.nombre===n; if(!ok) hlBarrio(g.properties.nombre,'#d23b2f',.35); resolve(ok, ok?'':`Tocaste ${esc(g.properties.nombre)}.`); }; },
    reveal(){ hlBarrio(n,'#1a8f4a',.45); }, explain:barrioExplain(n)};
}
function qBarrioCual(){
  const f=pickWeighted(BARRIOS,f=>'b:'+f.properties.nombre), n=f.properties.nombre;
  const pool = f.properties.vecinos.length>=3 ? f.properties.vecinos : BARRIOS.map(x=>x.properties.nombre);
  return {key:'b:'+n, prompt:'¿Qué barrio está pintado?', options:opts(n,pool),
    setup(){ layers({barrios:true,labels:false,av:false,subte:false}); barHover=false; fitCABA(); hlBarrio(n,'#d00000',.5); },
    answer:n, explain:barrioExplain(n)};
}
function qVecinos(){
  const f=pickWeighted(BARRIOS.filter(f=>f.properties.vecinos.length>=2),f=>'v:'+f.properties.nombre), n=f.properties.nombre, p=f.properties;
  const good=rnd(p.vecinos);
  const lejos = BARRIOS.map(x=>x.properties.nombre).filter(x=>x!==n && !p.vecinos.includes(x));
  return {key:'v:'+n, prompt:`¿Cuál de estos barrios <u>limita</u> con ${esc(n)}?`, options:shuffle([good,...shuffle(lejos).slice(0,3)]), answer:good,
    setup(){ layers({barrios:true,labels:false,av:false,subte:false}); barHover=false; hlBarrio(n,'#0b6bcb',.45); fitCABA(); },
    reveal(){ hlBarrio(good,'#1a8f4a',.45); label([BYB[n].properties.lat,BYB[n].properties.lon],n); label([BYB[good].properties.lat,BYB[good].properties.lon],good); },
    explain:`<br>${esc(n)} limita con: ${p.vecinos.map(esc).join(', ')}.`};
}
/* --- preguntas: avenidas --- */
function avExplain(n){ const p=BYAV[n].properties; return `<br><b>${esc(n)}</b> (${p.sentido}): ${esc(p.info)}`; }
function qAvCual(){
  const f=pickWeighted(AVS,f=>'a:'+f.properties.nombre), n=f.properties.nombre;
  const same=AVS.filter(x=>x.properties.sentido===f.properties.sentido).map(x=>x.properties.nombre);
  return {key:'a:'+n, prompt:'¿Qué avenida está marcada en rojo?', options:opts(n, same.length>=4?same:AVS.map(x=>x.properties.nombre)), answer:n,
    setup(){ layers({barrios:true,labels:true,av:false,subte:false}); barHover=false; hlAv(n,'#d00000',7,false); hlAv('Rivadavia','#999',3,false); fitCABA(); },
    explain:avExplain(n)};
}
function qAvDonde(){
  const f=pickWeighted(AVS.filter(x=>x.properties.nombre!=='General Paz'),f=>'a:'+f.properties.nombre), n=f.properties.nombre;
  return {key:'a:'+n, prompt:`Tocá la avenida <u>${esc(n)}</u>`, mapHint:`Tocá ${n} (tenés ~300 m de margen)`,
    setup(){ layers({barrios:true,labels:true,av:false,subte:false}); barHover=false; fitCABA();
      onMapClick=e=>{ const d=distToLine(e.latlng,f); L.circleMarker(e.latlng,{radius:7,color:d<300?'#1a8f4a':'#d23b2f',fillOpacity:.9}).addTo(hl);
        resolve(d<300, d<300?'':`Le erraste por ~${d<1000?Math.round(d/10)*10+' m':(d/1000).toFixed(1)+' km'}.`); };
      onBarrioClick=(g,e)=>onMapClick(e); },
    reveal(){ hlAv(n,'#1a8f4a',7,true); }, explain:avExplain(n)};
}
/* --- preguntas: subte --- */
const pillL = id => { const l=LBYID[id]; return `<span class="pill" style="background:${l.color};color:${l.texto}">${id}</span>`; };
function qSubteLinea(){
  const pool=ESTACIONES.filter(s=>nameCount[s.n]===1);
  const s=pickWeighted(pool,s=>'s:'+s.n);
  return {key:'s:'+s.n, prompt:`¿De qué línea es la estación <u>${esc(s.n)}</u>?`,
    options:LINEAS.map(l=>({html:`${pillL(l.id)} Línea ${l.id}`,val:l.id})), answer:s.linea,
    setup(){ layers({barrios:true,labels:false,av:false,subte:false}); barHover=false; },
    reveal(){ layers({barrios:true,labels:false,av:false,subte:true,est:true}); L.circleMarker([s.lat,s.lon],{radius:11,color:'#000',weight:3,fill:false}).addTo(hl).bindTooltip(s.n,{permanent:true,direction:'right'}); map.flyTo([s.lat,s.lon],13,{duration:.6}); },
    explain:`<br>${esc(s.n)} es de la línea ${pillL(s.linea)}, que va por ${esc(LBYID[s.linea].bajo)}.`};
}
function qSubteDonde(){
  const s=pickWeighted(ESTACIONES,s=>'sd:'+s.n+s.linea);
  return {key:'sd:'+s.n+s.linea, prompt:`Tocá dónde queda <u>${esc(s.n)}</u> ${pillL(s.linea)}`, mapHint:`¿Dónde está ${s.n}? (margen ~400 m)`,
    setup(){ layers({barrios:true,labels:true,av:false,subte:true,est:false}); barHover=false; fitCABA();
      onMapClick=e=>{ const d=map.distance(e.latlng,[s.lat,s.lon]); L.circleMarker(e.latlng,{radius:7,color:d<400?'#1a8f4a':'#d23b2f',fillOpacity:.9}).addTo(hl);
        resolve(d<400, d<400?'':`Quedaste a ~${d<1000?Math.round(d/10)*10+' m':(d/1000).toFixed(1)+' km'}.`); };
      onBarrioClick=(g,e)=>onMapClick(e); },
    reveal(){ L.circleMarker([s.lat,s.lon],{radius:9,color:'#000',weight:3,fillColor:LBYID[s.linea].color,fillOpacity:1}).addTo(hl).bindTooltip(s.n,{permanent:true,direction:'right'}); },
    explain:`<br>Línea ${pillL(s.linea)}: ${esc(LBYID[s.linea].bajo)}.`};
}
function qSubteSig(){
  const l=rnd(LINEAS), dir=Math.random()<.5?1:-1;
  const idxs=l.estaciones.map((_,i)=>i).filter(i=>l.estaciones[i+dir]);
  const i=rnd(idxs), s=l.estaciones[i], nx=l.estaciones[i+dir];
  const hacia=l.estaciones[dir>0?l.estaciones.length-1:0].n;
  const pool=l.estaciones.map(x=>x.n).filter(x=>x!==s.n);
  return {key:'ss:'+l.id+s.n+dir, prompt:`${pillL(l.id)} Estás en <u>${esc(s.n)}</u> yendo hacia ${esc(hacia)}. ¿Cuál es la próxima?`,
    options:opts(nx.n,pool), answer:nx.n,
    setup(){ layers({barrios:true,labels:false,av:false,subte:true,est:false}); barHover=false;
      L.circleMarker([s.lat,s.lon],{radius:9,color:'#000',weight:3,fillColor:l.color,fillOpacity:1}).addTo(hl); map.flyTo([s.lat,s.lon],13.5,{duration:.6}); },
    reveal(){ layers({barrios:true,labels:false,av:false,subte:true,est:true}); L.circleMarker([nx.lat,nx.lon],{radius:9,color:'#1a8f4a',weight:3,fillOpacity:.8}).addTo(hl).bindTooltip(nx.n,{permanent:true,direction:'right'}); },
    explain:`<br>Línea ${l.id}, en orden: ${l.estaciones.map(x=>esc(x.n)).join(' · ')}.`};
}
/* --- preguntas: nombres y números --- */
function qNombres(){
  const p=pickWeighted(PARES,p=>'n:'+p[0]); const norte=Math.random()<.5;
  const [desde,hacia]=norte?[p[0],p[1]]:[p[1],p[0]];
  const t=Math.random();
  const ex=`<br><b>${esc(p[0])}</b> (norte) ⇄ <b>${esc(p[1])}</b> (sur).`;
  const setup=()=>{ layers({barrios:true,labels:false,av:false,subte:false}); barHover=false; hlAv('Rivadavia','#d00000',6,true); map.flyToBounds([[-34.63,-58.41],[-34.59,-58.365]],{duration:.6}); };
  if(t<.6){
    const pool=PARES.map(x=>norte?x[1]:x[0]);
    return {key:'n:'+p[0], prompt:`Vas por <u>${esc(desde)}</u> hacia el ${norte?'sur':'norte'} y cruzás Rivadavia. ¿Cómo se llama ahora?`, options:opts(hacia,pool), answer:hacia, setup, explain:ex};
  }
  const c=rnd(p); const esN=c===p[0];
  return {key:'n:'+p[0], prompt:`La calle <u>${esc(c)}</u>, ¿está al norte o al sur de Rivadavia?`, options:['Al norte','Al sur'], answer:esN?'Al norte':'Al sur', setup, explain:ex};
}
function qNumeros(){
  const tipo=rnd(['cuadras','cuadras','vereda','vereda','desde']);
  const setup=()=>{ layers({barrios:true,labels:false,av:true,subte:false}); barHover=false; };
  if(tipo==='cuadras'){
    const calle=rnd(['Corrientes','Santa Fe','Rivadavia','San Juan','Córdoba','Independencia']);
    const a=(2+Math.floor(Math.random()*30))*100, b=a+(3+Math.floor(Math.random()*25))*100;
    const ans=(b-a)/100;
    return {key:null, prompt:`¿Cuántas cuadras hay de ${calle} ${a+Math.floor(Math.random()*90)} a ${calle} ${b+Math.floor(Math.random()*90)}?`,
      options:opts(String(ans),[ans-2,ans-1,ans+1,ans+2,ans*2,ans+10].filter(x=>x>0).map(String)), answer:String(ans), setup,
      explain:`<br>Cada cuadra son 100 números: (${b}-${a})/100 = ${ans} cuadras (en Buenos Aires una cuadra mide unos 100 m).`};
  }
  if(tipo==='desde'){
    const c=rnd([['Pueyrredón','norte'],['Callao','norte'],['Entre Ríos','sur'],['Jujuy','sur']]);
    const h=(3+Math.floor(Math.random()*15))*100;
    return {key:null, prompt:`Te pasan una dirección: <u>${c[0]} ${h}</u>. ¿Dónde queda?`,
      options:[`Unas ${h/100} cuadras al ${c[1]} de Rivadavia`,`Unas ${h/100} cuadras al ${c[1]==='norte'?'sur':'norte'} de Rivadavia`,`Unas ${h/100} cuadras del río`,`No se puede saber sin mapa`],
      answer:`Unas ${h/100} cuadras al ${c[1]} de Rivadavia`, setup, explain:`<br>${c[0]} corre norte-sur: arranca en Rivadavia y su numeración crece hacia el ${c[1]}.`};
  }
  const casos=[
    {d:'una calle este-oeste (como Corrientes)', par:false, r:'Vereda norte', e:'crece hacia el oeste; mirando al oeste, la derecha es el norte'},
    {d:'una calle este-oeste (como Corrientes)', par:true, r:'Vereda sur', e:'crece hacia el oeste; los pares quedan a la izquierda, o sea al sur'},
    {d:'una calle norte-sur al norte de Rivadavia (como Callao)', par:false, r:'Vereda este', e:'crece hacia el norte; mirando al norte, la derecha es el este'},
    {d:'una calle norte-sur al norte de Rivadavia (como Callao)', par:true, r:'Vereda oeste', e:'crece hacia el norte; los pares quedan a la izquierda, al oeste'},
    {d:'una calle norte-sur al sur de Rivadavia (como Entre Ríos)', par:false, r:'Vereda oeste', e:'crece hacia el sur; mirando al sur, la derecha es el oeste'},
    {d:'una calle norte-sur al sur de Rivadavia (como Entre Ríos)', par:true, r:'Vereda este', e:'crece hacia el sur; los pares quedan a la izquierda, al este'}];
  const c=rnd(casos); let num=(1+Math.floor(Math.random()*40))*100+1+2*Math.floor(Math.random()*45); if(c.par) num+=1;
  return {key:null, prompt:`Estás en ${c.d}, frente al número <u>${num}</u>. ¿En qué vereda estás?`,
    options:['Vereda norte','Vereda sur','Vereda este','Vereda oeste'], answer:c.r, setup,
    explain:`<br>Regla CABA: mirando hacia donde crece la numeración, impares a la derecha y pares a la izquierda. Acá ${c.e}.`};
}
const ORI=[
 ['¿Hacia qué punto cardinal queda el Río de la Plata desde el centro?',['Este','Oeste','Sur','Norte'],'Este','El río está al este (un poco noreste). Es la referencia principal.'],
 ['¿Qué separa a la ciudad de la provincia por el sur?',['El Riachuelo','La General Paz','La Av. Rivadavia','El arroyo Maldonado'],'El Riachuelo','El Riachuelo es el límite sur; la General Paz cierra por oeste y norte.'],
 ['Al mediodía, ¿dónde está el sol en Buenos Aires?',['Hacia el norte','Hacia el sur','Justo arriba siempre','Hacia el este'],'Hacia el norte','En el hemisferio sur, el sol del mediodía está al norte: tu sombra apunta al sur.'],
 ['¿Cuáles son las únicas dos avenidas que cruzan Rivadavia sin cambiar de nombre?',['9 de Julio y General Paz','Callao y Pueyrredón','Corrientes y Santa Fe','Libertador y Alem'],'9 de Julio y General Paz','Todas las demás cambian de nombre (con alguna excepción local).'],
 ['En el centro, si una calle va en bajada, ¿hacia dónde vas?',['Hacia el río (este)','Hacia el oeste','Hacia el Riachuelo','No indica nada'],'Hacia el río (este)','La ciudad está sobre una barranca; el Bajo (Alem/Paseo Colón) era la vieja orilla.'],
 ['¿Por dónde pasaba más o menos la antigua orilla del río?',['Paseo Colón y Alem','La 9 de Julio','Av. Callao','Av. Pueyrredón'],'Paseo Colón y Alem','Puerto Madero se construyó sobre tierra ganada al río.'],
 ['¿Cuántos barrios tiene la Ciudad de Buenos Aires?',['48','100','36','15'],'48','Son 48 barrios agrupados en 15 comunas.'],
 ['¿Cuántos números tiene una cuadra porteña?',['100','50','200','Depende del barrio'],'100','Por eso la altura dividida por 100 te dice cuántas cuadras recorriste.'],
 ['Las calles este-oeste, ¿desde dónde empiezan a numerarse?',['Del lado del río','Desde la General Paz','Desde Rivadavia','Desde el Riachuelo'],'Del lado del río','Arrancan del este (el río) y crecen hacia el oeste.'],
 ['Las calles norte-sur, ¿desde dónde se numeran?',['Desde Rivadavia, hacia los dos lados','Desde el río','Desde la General Paz','Desde el Riachuelo'],'Desde Rivadavia, hacia los dos lados','Rivadavia es el 0: al norte crecen hacia el norte y al sur hacia el sur.'],
 ['¿Debajo de qué avenida va la línea B?',['Corrientes','Rivadavia','Santa Fe','San Juan'],'Corrientes','La B va por Corrientes y después por Triunvirato.'],
 ['¿Qué línea de subte va por Santa Fe y Cabildo?',['D','A','E','H'],'D','La D: Diagonal Norte, Córdoba, Santa Fe y Cabildo.'],
 ['Pueyrredón, al cruzar Rivadavia hacia el sur, se llama…',['Jujuy','Entre Ríos','Boedo','La Plata'],'Jujuy','Y la línea H va justo por debajo de las dos.'],
 ['¿Qué avenida divide la ciudad en norte y sur?',['Rivadavia','Corrientes','9 de Julio','Juan B. Justo'],'Rivadavia','Es el eje de nombres y numeración.'],
 ['¿Sobre qué arroyo entubado corre la Av. Juan B. Justo?',['Maldonado','Medrano','Vega','Cildáñez'],'Maldonado','El arroyo Maldonado va entubado debajo de Juan B. Justo.'],
];
function qOrientacion(){
  const o=pickWeighted(ORI,o=>'o:'+o[0]);
  return {key:'o:'+o[0], prompt:o[0], options:shuffle(o[1]), answer:o[2], explain:'<br>'+o[3],
    setup(){ layers({barrios:true,labels:false,av:true,subte:false}); }};
}

/* ---------- arranque ---------- */
go('aprender');
})();
