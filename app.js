/* Orientate — app (MapLibre + OpenFreeMap) */
(function(){
'use strict';
const D = window.DATA, LECC = window.LECCIONES;
const $ = s => document.querySelector(s);
const panel = $('#panel');
const rnd = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const movil = () => matchMedia('(max-width:820px)').matches;

/* ---------- progreso ---------- */
const KEY='orientate_v1';
let P={xp:0,lecc:{},best:{},err:{}};
try{ const s=JSON.parse(localStorage.getItem(KEY)); if(s) P=Object.assign(P,s); }catch(e){}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(P));}catch(e){} $('#xp').textContent=P.xp; }
save();
const addErr=(k,d)=>{ P.err[k]=Math.max(0,(P.err[k]||0)+d); };
function pickWeighted(items,keyFn){
  const w=items.map(it=>1+3*(P.err[keyFn(it)]||0)); let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<items.length;i++){ r-=w[i]; if(r<=0) return items[i]; } return items[items.length-1];
}

/* ---------- datos ---------- */
const BARRIOS=D.barrios.features, BYB=Object.fromEntries(BARRIOS.map(f=>[f.properties.nombre,f]));
const AVS=D.avenidas.features, BYAV=Object.fromEntries(AVS.map(f=>[f.properties.nombre,f]));
const LINEAS=D.subte, LBYID=Object.fromEntries(LINEAS.map(l=>[l.id,l]));
const nameCount={}; LINEAS.forEach(l=>l.estaciones.forEach(s=>nameCount[s.n]=(nameCount[s.n]||0)+1));
const ESTACIONES=[]; LINEAS.forEach(l=>l.estaciones.forEach((s,i)=>ESTACIONES.push(Object.assign({linea:l.id,idx:i},s))));
const PARES=[['San Martín','Bolívar'],['Florida','Perú'],['Maipú','Chacabuco'],['Esmeralda','Piedras'],['Suipacha','Tacuarí'],
 ['Carlos Pellegrini','Bernardo de Irigoyen'],['Cerrito','Lima'],['Libertad','Salta'],['Talcahuano','Santiago del Estero'],
 ['Montevideo','Virrey Cevallos'],['Callao','Entre Ríos'],['Pueyrredón','Jujuy']];
const ZONA={};
'Retiro,San Nicolás,Monserrat,San Telmo,Puerto Madero,Constitución'.split(',').forEach(b=>ZONA[b]='centro');
'Recoleta,Palermo,Colegiales,Belgrano,Núñez,Saavedra,Coghlan,Villa Urquiza,Villa Ortúzar,Chacarita,Parque Chas,Villa Pueyrredón,Agronomía'.split(',').forEach(b=>ZONA[b]='norte');
'La Boca,Barracas,Parque Patricios,Nueva Pompeya,Villa Soldati,Villa Lugano,Villa Riachuelo,Parque Avellaneda,Mataderos'.split(',').forEach(b=>ZONA[b]='sur');
const zonaDe=b=>ZONA[b]||'oeste';
const ZCOL={centro:'#ffc36b',norte:'#a9e6b8',sur:'#ffb3cf',oeste:'#a8d8ff'};
BARRIOS.forEach(f=>{ f.properties.zcol=ZCOL[zonaDe(f.properties.nombre)]; });
const avTitulo=p=>p.calle||p.nombre.startsWith('Av.')?p.nombre:'Av. '+p.nombre;
const C={ink:'#2b2520',ok:'#1f6b4a',bad:'#c2462a',blue:'#1d4f8f',hi:'#ffcf3a',brown:'#8a5a00'};

/* ---------- mapa ---------- */
const BOUNDS=[[-58.535,-34.708],[-58.33,-34.525]];
const map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',bounds:BOUNDS,
  maxBounds:[[-59.3,-35.3],[-57.6,-34.0]],minZoom:8.5,maxZoom:17,attributionControl:{compact:true},dragRotate:false,pitchWithRotate:false,touchPitch:false});
map.touchZoomRotate.disableRotation(); window._map=map;
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
let BASE_SYM=[], ready=false; const onReady=[];
const whenReady=fn=>ready?fn():onReady.push(fn);
const EMPTY={type:'FeatureCollection',features:[]};
const lineFC=LINEAS.map(l=>({type:'Feature',properties:{id:l.id,color:l.color},geometry:{type:'LineString',coordinates:l.estaciones.map(s=>[s.lon,s.lat])}}));
const stFC=ESTACIONES.map(s=>({type:'Feature',properties:{n:s.n,linea:s.linea,color:LBYID[s.linea].color,idx:s.idx},geometry:{type:'Point',coordinates:[s.lon,s.lat]}}));
const FONT=['Noto Sans Bold'];
map.on('load',()=>{
  BASE_SYM=map.getStyle().layers.filter(l=>l.type==='symbol').map(l=>l.id);
  if(map.getLayer('building-3d')) map.setLayoutProperty('building-3d','visibility','none');
  map.addSource('limite',{type:'geojson',data:{type:'Feature',properties:{},geometry:D.limite}});
  map.addSource('barrios',{type:'geojson',data:D.barrios,promoteId:'nombre'});
  map.addSource('barrioPts',{type:'geojson',data:{type:'FeatureCollection',features:BARRIOS.map(f=>({type:'Feature',properties:{n:f.properties.nombre},geometry:{type:'Point',coordinates:[f.properties.lon,f.properties.lat]}}))}});
  map.addSource('av',{type:'geojson',data:D.avenidas,promoteId:'nombre'});
  map.addSource('subte',{type:'geojson',data:{type:'FeatureCollection',features:lineFC}});
  map.addSource('est',{type:'geojson',data:{type:'FeatureCollection',features:stFC}});
  ['hlPoly','hlLine','hlPt'].forEach(s=>map.addSource(s,{type:'geojson',data:{type:'FeatureCollection',features:[]}}));
  // capas
  map.addLayer({id:'mask-line',type:'line',source:'limite',paint:{'line-color':C.ink,'line-width':2.2,'line-opacity':.7}});
  map.addLayer({id:'b-fill',type:'fill',source:'barrios',paint:{'fill-color':['get','zcol'],'fill-opacity':['case',['boolean',['feature-state','hover'],false],.5,.24]}});
  map.addLayer({id:'b-line',type:'line',source:'barrios',paint:{'line-color':'#fff','line-width':1.6}});
  map.addLayer({id:'av-hit',type:'line',source:'av',paint:{'line-color':'#000','line-opacity':0,'line-width':18}});
  map.addLayer({id:'av-line',type:'line',source:'av',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['case',['boolean',['get','reinicia'],false],C.brown,C.ink],'line-width':['interpolate',['linear'],['zoom'],11,['case',['==',['get','nivel'],1],2.2,1.2],15,['case',['==',['get','nivel'],1],6,3]],'line-opacity':.8}});
  map.addLayer({id:'av-lbl',type:'symbol',source:'av',layout:{'symbol-placement':'line','text-field':['get','nombre'],'text-font':FONT,'text-size':12,'symbol-spacing':400},paint:{'text-color':C.ink,'text-halo-color':'#fffdf6','text-halo-width':2}});
  map.addLayer({id:'hl-fill',type:'fill',source:'hlPoly',paint:{'fill-color':['get','c'],'fill-opacity':['coalesce',['get','o'],.5]}});
  map.addLayer({id:'hl-poly-line',type:'line',source:'hlPoly',paint:{'line-color':['get','c'],'line-width':3}});
  map.addLayer({id:'sub-line',type:'line',source:'subte',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],11,3.5,15,8]}});
  map.addLayer({id:'hl-line-casing',type:'line',source:'hlLine',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fffdf6','line-width':['interpolate',['linear'],['zoom'],11,8,15,14]}});
  map.addLayer({id:'hl-line',type:'line',source:'hlLine',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','c'],'line-width':['interpolate',['linear'],['zoom'],11,4.5,15,9]}});
  map.addLayer({id:'st',type:'circle',source:'est',paint:{'circle-radius':['interpolate',['linear'],['zoom'],11,3.5,15,7],'circle-color':'#fff','circle-stroke-color':['get','color'],'circle-stroke-width':2.5}});
  map.addLayer({id:'st-lbl',type:'symbol',source:'est',minzoom:13.5,layout:{'text-field':['get','n'],'text-font':FONT,'text-size':11.5,'text-offset':[0,1.1],'text-anchor':'top'},paint:{'text-color':C.ink,'text-halo-color':'#fff','text-halo-width':2}});
  map.addLayer({id:'b-lbl',type:'symbol',source:'barrioPts',layout:{'text-field':['upcase',['get','n']],'text-font':FONT,'text-size':['interpolate',['linear'],['zoom'],11,9.5,14,13],'text-letter-spacing':.06,'text-max-width':7},paint:{'text-color':'#5b4a3a','text-halo-color':'#fffdf6','text-halo-width':1.6}});
  map.addLayer({id:'hl-line-lbl',type:'symbol',source:'hlLine',filter:['has','l'],layout:{'symbol-placement':'line','text-field':['get','l'],'text-font':FONT,'text-size':14,'symbol-spacing':350},paint:{'text-color':['get','c'],'text-halo-color':'#fffdf6','text-halo-width':2.5}});
  map.addLayer({id:'hl-pt',type:'circle',source:'hlPt',filter:['!',['boolean',['get','solo'],false]],paint:{'circle-radius':['coalesce',['get','r'],8],'circle-color':['get','c'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
  map.addLayer({id:'hl-pt-lbl',type:'symbol',source:'hlPt',filter:['has','l'],layout:{'text-field':['get','l'],'text-font':FONT,'text-size':14,'text-offset':['case',['boolean',['get','solo'],false],['literal',[0,0]],['literal',[0,1.3]]],'text-anchor':['case',['boolean',['get','solo'],false],'center','top'],'text-max-width':12},paint:{'text-color':['coalesce',['get','tc'],C.ink],'text-halo-color':'#fffdf6','text-halo-width':2.5}});
  // interacción
  let hov=null;
  map.on('mousemove','b-fill',e=>{ if(!barHover) return; const n=e.features[0].id; if(hov!==n){ if(hov) map.setFeatureState({source:'barrios',id:hov},{hover:false}); hov=n; map.setFeatureState({source:'barrios',id:n},{hover:true}); } });
  map.on('mouseleave','b-fill',()=>{ if(hov) map.setFeatureState({source:'barrios',id:hov},{hover:false}); hov=null; });
  ['b-fill','av-hit','st'].forEach(l=>{ map.on('mouseenter',l,()=>{ if(clickable()) map.getCanvas().style.cursor='pointer'; }); map.on('mouseleave',l,()=>map.getCanvas().style.cursor=''); });
  map.on('click',e=>{
    const pick=l=>map.getLayer(l)&&map.getLayoutProperty(l,'visibility')!=='none'?map.queryRenderedFeatures(e.point,{layers:[l]}):[];
    if(onStClick){ const f=pick('st')[0]; if(f) return onStClick(f.properties); }
    if(onAvClick){ const f=pick('av-hit')[0]; if(f) return onAvClick(BYAV[f.properties.nombre]); }
    if(onBarrioClick){ const f=pick('b-fill')[0]; if(f) return onBarrioClick(BYB[f.properties.nombre]); }
    if(onMapClick) onMapClick(e.lngLat);
  });
  document.querySelectorAll('.maplibregl-ctrl-attrib').forEach(a=>a.classList.remove('maplibregl-compact-show'));
  ready=true; onReady.splice(0).forEach(f=>f());
});
let onBarrioClick=null,onAvClick=null,onMapClick=null,onStClick=null,barHover=true;
const clickable=()=>!!(onBarrioClick||onAvClick||onStClick);
function clearHandlers(){ onBarrioClick=onAvClick=onMapClick=onStClick=null; }
const vis=(id,on)=>map.getLayer(id)&&map.setLayoutProperty(id,'visibility',on?'visible':'none');
function capas(o){ whenReady(()=>{
  vis('b-fill',o.barrios); vis('b-line',o.barrios);
  vis('b-lbl',!!o.labels);
  ['av-line','av-hit'].forEach(l=>vis(l,!!o.av)); vis('av-lbl',!!o.avlbl);
  vis('sub-line',!!o.subte); vis('st',!!o.est); vis('st-lbl',!!o.est&&!!o.estlbl);
  BASE_SYM.forEach(l=>vis(l,!!o.calles));
});}
/* resaltados */
let HL={poly:[],line:[],pt:[]};
let hlPend=false;
function hlFlush(){ if(hlPend) return; hlPend=true; requestAnimationFrame(()=>{ hlPend=false; whenReady(()=>{
  const fc=a=>({type:'FeatureCollection',features:JSON.parse(JSON.stringify(a))});
  map.getSource('hlPoly').setData(fc(HL.poly)); map.getSource('hlLine').setData(fc(HL.line)); map.getSource('hlPt').setData(fc(HL.pt)); }); }); }
function hlClear(){ HL={poly:[],line:[],pt:[]}; hlFlush(); }
function hlAv(n,c,w,lbl){ const f=BYAV[n]; if(!f) return; HL.line.push({type:'Feature',properties:Object.assign({c:c||C.bad,w:w||6},lbl?{l:n}:{}),geometry:f.geometry}); hlFlush(); }
function hlBarrio(n,c,o){ HL.poly.push({type:'Feature',properties:{c:c||C.bad,o:o==null?.5:o},geometry:BYB[n].geometry}); hlFlush(); }
function hlPt(lnglat,c,l,extra){ HL.pt.push({type:'Feature',properties:Object.assign({c:c||C.ink},l?{l}:{},extra||{}),geometry:{type:'Point',coordinates:lnglat}}); hlFlush(); }
function etiqueta(lnglat,l,tc){ hlPt(lnglat,null,l,{solo:true,tc}); }
function pad(){ return movil()?{top:70,bottom:Math.round(innerHeight*($('#hoja').classList.contains('chica')?0:.52))+10,left:12,right:12}:{top:80,bottom:30,left:450,right:70}; }
function encuadre(b,dur){ whenReady(()=>map.fitBounds(b||BOUNDS,{padding:pad(),duration:dur==null?700:dur})); }
function volarA(lnglat,z){ whenReady(()=>map.easeTo({center:lnglat,zoom:z||14,padding:pad(),duration:700})); }
function distToLine(ll,f){
  const k=Math.cos(ll.lat*Math.PI/180)*111320,kk=110540,px=ll.lng*k,py=ll.lat*kk; let best=Infinity;
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
  lines.forEach(ln=>{ for(let i=0;i<ln.length-1;i++){ const ax=ln[i][0]*k,ay=ln[i][1]*kk,bx=ln[i+1][0]*k,by=ln[i+1][1]*kk,dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
    let t=L2?((px-ax)*dx+(py-ay)*dy)/L2:0; t=Math.max(0,Math.min(1,t)); best=Math.min(best,Math.hypot(px-(ax+t*dx),py-(ay+t*dy))); }});
  return best;
}
const distM=(a,b)=>{ const k=Math.cos(a.lat*Math.PI/180)*111320; return Math.hypot((a.lng-b[0])*k,(a.lat-b[1])*110540); };
const fmtD=d=>d<1000?`${Math.round(d/10)*10} m`:`${(d/1000).toFixed(1)} km`;
function aviso(t){ const a=$('#aviso'); if(t){a.textContent=t;a.hidden=false;} else a.hidden=true; }

/* hoja en celular */
$('#asa').onclick=()=>$('#hoja').classList.toggle('chica');

/* ---------- pestañas ---------- */
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>ir(b.dataset.tab));
function ir(tab){
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));
  clearHandlers(); hlClear(); aviso(null); barHover=true; $('#hoja').classList.remove('chica');
  ({aprender:vAprender,explorar:vExplorar,jugar:vJugar})[tab](); panel.scrollTop=0;
}

/* ---------- APRENDER ---------- */
function vAprender(){
  capas({barrios:true,labels:true,av:true});
  const hechas=LECC.filter(l=>P.lecc[l.id]).length;
  panel.innerHTML=`<p class="kick">Aprender · ${LECC.length} lecciones</p>
  <h1>La lógica de la ciudad</h1>
  <p class="lead">Buenos Aires tiene reglas. Cuando las sabés, dejás de necesitar el GPS. Abrí una y mirá el mapa.</p>
  <div class="prog"><span class="t"><i style="width:${hechas/LECC.length*100}%"></i></span>${hechas}/${LECC.length}</div>
  ${LECC.map((l,i)=>`<div class="lec ${P.lecc[l.id]?'done':''}" data-id="${l.id}">
    <button class="lec-h"><span class="n">${String(i+1).padStart(2,'0')}</span><h2>${esc(l.titulo.replace(/^\d+\.\s*/,''))}</h2><span class="ok">${P.lecc[l.id]?'✓':''}</span></button>
    <div class="lec-b" hidden>${l.html}<div class="row" style="margin-top:10px"><button class="btn sm" data-listo>Entendido</button></div></div></div>`).join('')}`;
  panel.querySelectorAll('.lec').forEach(el=>{
    const id=el.dataset.id, body=el.querySelector('.lec-b');
    el.querySelector('.lec-h').onclick=()=>{
      const abrir=body.hidden;
      panel.querySelectorAll('.lec').forEach(x=>{x.classList.remove('open');x.querySelector('.lec-b').hidden=true;});
      if(abrir){ el.classList.add('open'); body.hidden=false; accion(LECC.find(l=>l.id===id).accion); el.scrollIntoView({behavior:'smooth',block:'start'}); }
      else { hlClear(); capas({barrios:true,labels:true,av:true}); encuadre(); }
    };
    el.querySelector('[data-listo]').onclick=()=>{
      if(!P.lecc[id]){P.lecc[id]=1;P.xp+=5;save();}
      el.classList.add('done'); el.querySelector('.ok').textContent='✓'; body.hidden=true; el.classList.remove('open');
      const nx=el.nextElementSibling; if(nx) nx.querySelector('.lec-h').click();
    };
  });
  encuadre();
}
function accion(a){
  hlClear(); capas({barrios:true,labels:false,av:true});
  if(a==='bordes'){
    hlAv('General Paz',C.bad,6,true); etiqueta([-58.352,-34.575],'RÍO DE LA PLATA · ESTE',C.blue); etiqueta([-58.41,-34.672],'RIACHUELO · SUR',C.blue); encuadre();
  } else if(a==='rivadavia'){
    hlAv('Rivadavia',C.bad,8,true); hlAv('9 de Julio',C.blue,5,true); hlAv('General Paz',C.blue,5,false);
    etiqueta([-58.465,-34.587],'NORTE'); etiqueta([-58.465,-34.655],'SUR'); encuadre();
  } else if(a==='numeracion'){
    hlAv('Rivadavia','#9a8b7a',5,false); hlAv('Corrientes',C.bad,7,true); hlAv('Pueyrredón',C.blue,7,true); hlAv('Jujuy',C.blue,7,true);
    hlPt([-58.3685,-34.6033],C.bad,'Corrientes 0'); etiqueta([-58.437,-34.5985],'la altura crece hacia el oeste',C.bad);
    hlPt([-58.4060,-34.6095],C.blue,'Pueyrredón / Jujuy 0'); etiqueta([-58.4115,-34.590],'crece hacia el norte',C.blue); etiqueta([-58.4115,-34.630],'crece hacia el sur',C.blue);
    encuadre([[-58.45,-34.64],[-58.36,-34.585]]);
  } else if(a==='pares'){
    capas({barrios:true,labels:false,av:false,calles:true});
    hlAv('Rivadavia','#9a8b7a',6,true); ['Callao','Pueyrredón'].forEach(n=>hlAv(n,C.blue,6,true)); ['Entre Ríos','Jujuy'].forEach(n=>hlAv(n,C.bad,6,true));
    etiqueta([-58.372,-34.598],'NORTE',C.blue); etiqueta([-58.372,-34.62],'SUR',C.bad);
    encuadre([[-58.415,-34.632],[-58.368,-34.588]]);
  } else if(a==='reinicia'){
    AVS.filter(f=>f.properties.reinicia).forEach(f=>hlAv(f.properties.nombre,C.bad,6,true)); encuadre([[-58.47,-34.625],[-58.37,-34.555]]);
  } else if(a==='nivel1'){
    AVS.filter(f=>f.properties.nivel===1).forEach(f=>hlAv(f.properties.nombre,f.properties.sentido==='este-oeste'?C.bad:f.properties.sentido==='norte-sur'?C.blue:C.ok,5,true));
    encuadre([[-58.47,-34.64],[-58.36,-34.56]]);
  } else if(a==='subte'){
    capas({barrios:true,labels:false,subte:true,est:true});
    LINEAS.forEach(l=>{ const s=l.estaciones[l.estaciones.length-1]; hlPt([s.lon,s.lat],l.color,'Línea '+l.id,{r:9}); });
    encuadre([[-58.49,-34.645],[-58.36,-34.55]]);
  } else if(a==='barranca'){
    capas({barrios:true,labels:false,av:false,calles:true});
    hlAv('Leandro N. Alem',C.brown,7,true); hlAv('Paseo Colón',C.brown,7,true); hlBarrio('Puerto Madero',C.blue,.25);
    hlPt([-58.3753,-34.5953],C.ok,'Plaza San Martín · arriba'); hlPt([-58.3696,-34.6287],C.ok,'Parque Lezama · arriba');
    encuadre([[-58.39,-34.635],[-58.355,-34.588]]);
  } else if(a==='barrios'){ capas({barrios:true,labels:true}); encuadre(); }
}

/* ---------- EXPLORAR ---------- */
function vExplorar(){
  const st={barrios:true,labels:true,av:true,avlbl:true,subte:true,est:true,estlbl:true,calles:false};
  const aplicar=()=>capas(st); aplicar(); encuadre();
  const CAP=[['barrios','Barrios'],['labels','Nombres'],['av','Avenidas'],['subte','Subte'],['calles','Todas las calles']];
  panel.innerHTML=`<p class="kick">Explorar</p><h1>Mirá y tocá</h1>
  <p class="lead">Tocá un barrio, una avenida o una estación. Apagá capas para ver el mapa "desnudo" y probarte.</p>
  <div class="capas">${CAP.map(([k,t])=>`<button class="capa" data-k="${k}" aria-pressed="${st[k]}">${t}</button>`).join('')}</div>
  <div class="zonas">${Object.entries(ZCOL).map(([z,c])=>`<span class="zona" style="background:${c}">${z}</span>`).join('')}</div>
  <div id="ficha" class="ficha"><p class="vacio">Elegí algo en el mapa.</p></div>`;
  panel.querySelectorAll('.capa').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; st[k]=!st[k]; if(k==='av') st.avlbl=st.av; if(k==='subte'){st.est=st.subte;st.estlbl=st.subte;} b.setAttribute('aria-pressed',st[k]); aplicar(); });
  const ficha=$('#ficha');
  const verBarrio=f=>{
    hlClear(); hlBarrio(f.properties.nombre,C.bad,.25); const p=f.properties;
    ficha.innerHTML=`<div class="meta">Comuna ${p.comuna} · zona ${zonaDe(p.nombre)} · ${p.km2} km²</div><h2>${esc(p.nombre)}</h2>
    <p>${esc(p.origen)}</p><div class="meta" style="margin-top:12px">Limita con</div><div class="chips">${p.vecinos.map(v=>`<button class="chip" data-b="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
    ficha.querySelectorAll('[data-b]').forEach(c=>c.onclick=()=>verBarrio(BYB[c.dataset.b]));
    if(movil()) $('#hoja').classList.remove('chica');
  };
  onBarrioClick=verBarrio;
  onAvClick=f=>{ hlClear(); hlAv(f.properties.nombre,C.bad,8,false); const p=f.properties;
    ficha.innerHTML=`<div class="meta">${p.sentido}${p.subte?' · subte '+esc(p.subte):''}</div><h2>${esc(avTitulo(p))}</h2><p>${esc(p.info)}</p>`; };
  onStClick=s=>{ const l=LBYID[s.linea], i=+s.idx, prev=l.estaciones[i-1], next=l.estaciones[i+1];
    const comb=ESTACIONES.filter(e=>e.linea!==l.id&&Math.hypot((e.lat-l.estaciones[i].lat)*111,(e.lon-l.estaciones[i].lon)*92)<0.35);
    ficha.innerHTML=`<div class="meta">Línea ${l.id} · ${esc(l.bajo)}</div><h2><span class="pill" style="background:${l.color};color:${l.texto}">${l.id}</span> ${esc(s.n)}</h2>
    <p class="mono" style="font-size:.85rem">${prev?'← '+esc(prev.n):'cabecera'} &nbsp;·&nbsp; ${next?esc(next.n)+' →':'cabecera'}</p>
    ${comb.length?`<p><b>Cerca / combina:</b> ${comb.map(c=>`${esc(c.n)} (${c.linea})`).join(', ')}</p>`:''}`; };
}

/* ---------- JUGAR ---------- */
const PCOL=['#ffe76a','#ffb3cf','#a9e6b8','#a8d8ff','#ffc36b','#fff4a8'];
const GAMES=[
 {id:'b_donde',e:'📍',t:'¿Dónde queda?',d:'Te digo un barrio, lo tocás.',gen:qBarrioDonde},
 {id:'b_cual',e:'🏘️',t:'¿Qué barrio es?',d:'Se pinta uno, decí cuál.',gen:qBarrioCual},
 {id:'b_vec',e:'🧩',t:'Vecinos',d:'¿Con quién limita?',gen:qVecinos},
 {id:'a_cual',e:'🛣️',t:'¿Qué avenida es?',d:'Se marca una, adiviná.',gen:qAvCual},
 {id:'a_donde',e:'✏️',t:'Encontrá la avenida',d:'Tocala en el mapa.',gen:qAvDonde},
 {id:'s_linea',e:'🚇',t:'¿Qué línea?',d:'Una estación, seis líneas.',gen:qSubteLinea},
 {id:'s_donde',e:'🎯',t:'Ubicá la estación',d:'Tocá dónde queda.',gen:qSubteDonde},
 {id:'s_sig',e:'➡️',t:'Próxima estación',d:'¿Qué viene después?',gen:qSubteSig},
 {id:'n_riv',e:'🔀',t:'Piedras en Esmeralda',d:'Nombres que cambian en Rivadavia.',gen:qNombres},
 {id:'n_num',e:'🔢',t:'Alturas y veredas',d:'Cuadras, pares e impares.',gen:qNumeros},
 {id:'o_ori',e:'🧭',t:'Orientación',d:'Río, sol, barranca.',gen:qOrientacion},
 {id:'mix',e:'🏆',t:'Desafío porteño',d:'Diez preguntas de todo. ¿Cuánto sabés de verdad?',gen:()=>rnd(GAMES.filter(g=>g.id!=='mix')).gen()},
];
function vJugar(){
  capas({barrios:true,labels:true}); encuadre();
  const mix=GAMES.find(g=>g.id==='mix');
  panel.innerHTML=`<p class="kick">Jugar · rondas de 10</p><h1>Ponete a prueba</h1>
  <p class="lead">Lo que errás vuelve más seguido hasta que te lo aprendés.</p>
  <div class="juegos">
  <button class="postit ancho" data-g="mix"><span class="e">${mix.e}</span><b>${mix.t}</b><span>${mix.d}</span>${P.best.mix!=null?`<span class="rec">RÉCORD ${P.best.mix}/10</span>`:''}</button>
  ${GAMES.filter(g=>g.id!=='mix').map((g,i)=>`<button class="postit" data-g="${g.id}" style="background:${PCOL[i%PCOL.length]}"><span class="e">${g.e}</span><b>${g.t}</b><span>${g.d}</span>${P.best[g.id]!=null?`<span class="rec">RÉCORD ${P.best[g.id]}/10</span>`:''}</button>`).join('')}
  </div>`;
  panel.querySelectorAll('.postit').forEach(b=>b.onclick=()=>empezar(GAMES.find(g=>g.id===b.dataset.g)));
}
let G=null;
function empezar(game){ G={game,n:0,ok:0,racha:0,res:[],last:null}; sig(); }
function sig(){
  clearHandlers(); hlClear(); aviso(null);
  if(G.n>=10) return fin();
  let q,t=0; do{ q=G.game.gen(); t++; }while(q.key&&q.key===G.last&&t<6);
  G.last=q.key; G.q=q; G.n++; G.resp=false;
  panel.innerHTML=`<div class="top"><button class="btn sec sm" id="salir">← Juegos</button>${G.racha>=2?`<span class="racha">🔥 ${G.racha}</span>`:''}<span class="tt">${esc(G.game.t)} · ${G.n}/10</span></div>
  <div class="puntos">${Array.from({length:10},(_,i)=>`<i class="${G.res[i]===true?'ok':G.res[i]===false?'bad':i===G.n-1?'now':''}"></i>`).join('')}</div>
  <p class="q">${q.prompt}</p><div class="opts" id="opts"></div><div id="fb"></div>`;
  $('#salir').onclick=()=>ir('jugar');
  q.setup&&q.setup();
  const box=$('#opts');
  if(q.options){
    q.options.forEach((o,i)=>{ const b=document.createElement('button'); b.className='opt'; const val=o.val!=null?o.val:o;
      b.innerHTML=`<span class="k">${'ABCDEF'[i]}</span>${o.html||esc(o)}`; b._v=val;
      b.onclick=()=>{ if(G.resp) return; const ok=val===q.answer; box.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(x._v===q.answer) x.classList.add('ok');}); if(!ok) b.classList.add('bad'); resolver(ok); };
      box.appendChild(b); });
  } else { box.innerHTML=`<div class="tocar">${esc(q.mapHint||'Tocá en el mapa')}</div>`; aviso(q.mapHint||'Tocá en el mapa'); if(movil()) $('#hoja').classList.add('chica'); }
}
function resolver(ok,extra){
  if(G.resp) return; G.resp=true; clearHandlers(); aviso(null); $('#hoja').classList.remove('chica');
  const q=G.q; G.res[G.n-1]=ok;
  if(ok){ G.ok++; G.racha++; P.xp+=10+Math.min(G.racha-1,5)*2; if(q.key) addErr(q.key,-1); } else { G.racha=0; if(q.key) addErr(q.key,1); }
  save(); q.reveal&&q.reveal(ok);
  $('#fb').innerHTML=`<div class="fb ${ok?'ok':'bad'}"><span class="v">${ok?rnd(['¡Bien ahí!','¡Exacto!','¡Crack!','¡Eso!']):rnd(['No era.','Casi…','Uh, no.'])}</span>${extra?esc(extra)+' ':''}${q.explain||''}</div>
  <div class="row" style="margin-top:12px"><button class="btn" id="seguir">${G.n>=10?'Ver resultado':'Siguiente →'}</button></div>`;
  $('#seguir').onclick=sig; $('#seguir').focus({preventScroll:true});
  $('#fb').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function fin(){
  const prev=P.best[G.game.id]; const rec=prev==null||G.ok>prev; if(rec) P.best[G.game.id]=G.ok; save();
  hlClear(); capas({barrios:true,labels:true}); encuadre();
  const msg=G.ok>=9?'Nivel taxista. 🚕':G.ok>=7?'Muy bien, ya te movés solo.':G.ok>=4?'Vas armando el mapa. Otra ronda.':'Tranqui: repasá la lección y volvé.';
  panel.innerHTML=`<p class="kick">${esc(G.game.t)}</p><div class="final"><div class="big">${G.ok}<small>/10</small></div><p style="font:700 1.2rem var(--hand)">${msg}</p>${rec&&prev!=null?'<p class="mono">NUEVO RÉCORD</p>':''}</div>
  <div class="puntos">${G.res.map(r=>`<i class="${r?'ok':'bad'}"></i>`).join('')}</div>
  <div class="row" style="justify-content:center"><button class="btn" id="otra">Otra ronda</button><button class="btn sec" id="volver">Juegos</button></div>`;
  $('#otra').onclick=()=>empezar(G.game); $('#volver').onclick=()=>ir('jugar');
}
const opts=(c,pool,n=4)=>shuffle([c,...shuffle(pool.filter(x=>x!==c)).slice(0,n-1)]);
const pillL=id=>{ const l=LBYID[id]; return `<span class="pill" style="background:${l.color};color:${l.texto}">${id}</span>`; };
const ll=f=>[f.properties.lon,f.properties.lat];

/* barrios */
const bExp=n=>{ const p=BYB[n].properties; return `<b>${esc(n)}</b>: ${esc(p.origen)}<span class="det">Limita con ${p.vecinos.map(esc).join(', ')}.</span>`; };
function qBarrioDonde(){
  const f=pickWeighted(BARRIOS,f=>'b:'+f.properties.nombre), n=f.properties.nombre;
  return {key:'b:'+n,prompt:`Tocá <u>${esc(n)}</u>`,mapHint:`¿Dónde queda ${n}?`,
    setup(){ capas({barrios:true}); barHover=true; encuadre();
      onBarrioClick=g=>{ const ok=g.properties.nombre===n; if(!ok) hlBarrio(g.properties.nombre,C.bad,.55); resolver(ok,ok?'':`Tocaste ${g.properties.nombre}.`); }; },
    reveal(){ hlBarrio(n,C.ok,.6); etiqueta(ll(f),n.toUpperCase()); },explain:bExp(n)};
}
function qBarrioCual(){
  const f=pickWeighted(BARRIOS,f=>'b:'+f.properties.nombre), n=f.properties.nombre;
  const pool=f.properties.vecinos.length>=3?f.properties.vecinos:BARRIOS.map(x=>x.properties.nombre);
  return {key:'b:'+n,prompt:'¿Qué barrio está pintado?',options:opts(n,pool),answer:n,
    setup(){ capas({barrios:true}); barHover=false; encuadre(); hlBarrio(n,C.bad,.65); },explain:bExp(n)};
}
function qVecinos(){
  const f=pickWeighted(BARRIOS.filter(f=>f.properties.vecinos.length>=2),f=>'v:'+f.properties.nombre), n=f.properties.nombre, p=f.properties;
  const good=rnd(p.vecinos), lejos=BARRIOS.map(x=>x.properties.nombre).filter(x=>x!==n&&!p.vecinos.includes(x));
  return {key:'v:'+n,prompt:`¿Cuál limita con <u>${esc(n)}</u>?`,options:shuffle([good,...shuffle(lejos).slice(0,3)]),answer:good,
    setup(){ capas({barrios:true}); barHover=false; hlBarrio(n,C.blue,.6); etiqueta(ll(f),n.toUpperCase()); encuadre(); },
    reveal(){ hlBarrio(good,C.ok,.6); etiqueta(ll(BYB[good]),good.toUpperCase()); },
    explain:`${esc(n)} limita con ${p.vecinos.map(esc).join(', ')}.`};
}
/* avenidas */
const aExp=n=>{ const p=BYAV[n].properties; return `<b>${esc(avTitulo(p))}</b> · ${p.sentido}. ${esc(p.info)}`; };
function qAvCual(){
  const f=pickWeighted(AVS,f=>'a:'+f.properties.nombre), n=f.properties.nombre;
  const same=AVS.filter(x=>x.properties.sentido===f.properties.sentido).map(x=>x.properties.nombre);
  return {key:'a:'+n,prompt:'¿Qué avenida está marcada?',options:opts(n,same.length>=4?same:AVS.map(x=>x.properties.nombre)),answer:n,
    setup(){ capas({barrios:true,labels:true}); barHover=false; if(n!=='Rivadavia') hlAv('Rivadavia','#9a8b7a',3,false); hlAv(n,C.bad,7,false); encuadre(); },explain:aExp(n)};
}
function qAvDonde(){
  const f=pickWeighted(AVS.filter(x=>x.properties.nombre!=='General Paz'),f=>'a:'+f.properties.nombre), n=f.properties.nombre;
  return {key:'a:'+n,prompt:`Tocá <u>${esc(avTitulo(f.properties))}</u>`,mapHint:`Tocá ${n} · margen 300 m`,
    setup(){ capas({barrios:true,labels:true}); barHover=false; encuadre();
      onMapClick=p=>{ const d=distToLine(p,f); hlPt([p.lng,p.lat],d<300?C.ok:C.bad); resolver(d<300,d<300?'':`Le erraste por ${fmtD(d)}.`); }; },
    reveal(){ hlAv(n,C.ok,7,true); },explain:aExp(n)};
}
/* subte */
function qSubteLinea(){
  const s=pickWeighted(ESTACIONES.filter(s=>nameCount[s.n]===1),s=>'s:'+s.n);
  return {key:'s:'+s.n,prompt:`¿De qué línea es <u>${esc(s.n)}</u>?`,options:LINEAS.map(l=>({html:`${pillL(l.id)} Línea ${l.id}`,val:l.id})),answer:s.linea,
    setup(){ capas({barrios:true}); barHover=false; },
    reveal(){ capas({barrios:true,subte:true,est:true}); hlPt([s.lon,s.lat],C.ink,s.n,{r:10}); volarA([s.lon,s.lat],13); },
    explain:`${esc(s.n)} es de la ${pillL(s.linea)}, que va por ${esc(LBYID[s.linea].bajo)}.`};
}
function qSubteDonde(){
  const s=pickWeighted(ESTACIONES,s=>'sd:'+s.n+s.linea);
  return {key:'sd:'+s.n+s.linea,prompt:`Tocá <u>${esc(s.n)}</u> ${pillL(s.linea)}`,mapHint:`¿Dónde está ${s.n}? · margen 400 m`,
    setup(){ capas({barrios:true,labels:true,subte:true}); barHover=false; encuadre();
      onMapClick=p=>{ const d=distM(p,[s.lon,s.lat]); hlPt([p.lng,p.lat],d<400?C.ok:C.bad); resolver(d<400,d<400?'':`Quedaste a ${fmtD(d)}.`); }; },
    reveal(){ hlPt([s.lon,s.lat],LBYID[s.linea].color,s.n,{r:10}); },explain:`Línea ${pillL(s.linea)}: ${esc(LBYID[s.linea].bajo)}.`};
}
function qSubteSig(){
  const l=rnd(LINEAS), dir=Math.random()<.5?1:-1, idxs=l.estaciones.map((_,i)=>i).filter(i=>l.estaciones[i+dir]);
  const i=rnd(idxs), s=l.estaciones[i], nx=l.estaciones[i+dir], hacia=l.estaciones[dir>0?l.estaciones.length-1:0].n;
  return {key:'ss:'+l.id+s.n+dir,prompt:`${pillL(l.id)} Estás en <u>${esc(s.n)}</u> yendo a ${esc(hacia)}. ¿Próxima?`,
    options:opts(nx.n,l.estaciones.map(x=>x.n).filter(x=>x!==s.n)),answer:nx.n,
    setup(){ capas({barrios:true,subte:true}); barHover=false; hlPt([s.lon,s.lat],l.color,s.n,{r:10}); volarA([s.lon,s.lat],13.5); },
    reveal(){ hlPt([nx.lon,nx.lat],C.ok,nx.n,{r:10}); },
    explain:`<span class="det">${l.estaciones.map(x=>esc(x.n)).join(' · ')}</span>`};
}
/* nombres y números */
function qNombres(){
  const p=pickWeighted(PARES,p=>'n:'+p[0]), norte=Math.random()<.5, [desde,hacia]=norte?[p[0],p[1]]:[p[1],p[0]];
  const ex=`<b>${esc(p[0])}</b> (norte) ⇄ <b>${esc(p[1])}</b> (sur).`;
  const setup=()=>{ capas({barrios:true,calles:true}); barHover=false; hlAv('Rivadavia',C.bad,6,true); encuadre([[-58.41,-34.63],[-58.365,-34.59]]); };
  if(Math.random()<.6) return {key:'n:'+p[0],prompt:`Vas por <u>${esc(desde)}</u> hacia el ${norte?'sur':'norte'} y cruzás Rivadavia. ¿Cómo se llama ahora?`,options:opts(hacia,PARES.map(x=>norte?x[1]:x[0])),answer:hacia,setup,explain:ex};
  const c=rnd(p);
  return {key:'n:'+p[0],prompt:`<u>${esc(c)}</u>, ¿al norte o al sur de Rivadavia?`,options:['Al norte','Al sur'],answer:c===p[0]?'Al norte':'Al sur',setup,explain:ex};
}
function qNumeros(){
  const tipo=rnd(['cuadras','cuadras','vereda','vereda','desde']); const setup=()=>{ capas({barrios:true,av:true}); barHover=false; };
  if(tipo==='cuadras'){
    const calle=rnd(['Corrientes','Santa Fe','Rivadavia','San Juan','Córdoba','Independencia']);
    const a=(2+Math.floor(Math.random()*30))*100, b=a+(3+Math.floor(Math.random()*25))*100, ans=(b-a)/100;
    return {key:null,prompt:`¿Cuántas cuadras hay de ${calle} ${a+Math.floor(Math.random()*90)} a ${calle} ${b+Math.floor(Math.random()*90)}?`,
      options:opts(String(ans),[ans-2,ans-1,ans+1,ans+2,ans*2,ans+10].filter(x=>x>0).map(String)),answer:String(ans),setup,
      explain:`Cada cuadra son 100 números: (${b} − ${a}) / 100 = ${ans}.`};
  }
  if(tipo==='desde'){
    const c=rnd([['Pueyrredón','norte'],['Callao','norte'],['Entre Ríos','sur'],['Jujuy','sur']]), h=(3+Math.floor(Math.random()*15))*100, k=h/100;
    const good=`Unas ${k} cuadras al ${c[1]} de Rivadavia`;
    return {key:null,prompt:`Te pasan <u>${c[0]} ${h}</u>. ¿Dónde queda?`,options:[good,`Unas ${k} cuadras al ${c[1]==='norte'?'sur':'norte'} de Rivadavia`,`Unas ${k} cuadras del río`,'No se puede saber sin mapa'],answer:good,setup,
      explain:`${c[0]} corre norte-sur: arranca en Rivadavia y crece hacia el ${c[1]}.`};
  }
  const casos=[
    ['una calle este-oeste (tipo Corrientes)',false,'Vereda norte','crece hacia el oeste; mirando al oeste, la derecha es el norte'],
    ['una calle este-oeste (tipo Corrientes)',true,'Vereda sur','crece hacia el oeste; los pares quedan a la izquierda, al sur'],
    ['una calle norte-sur, al norte de Rivadavia (tipo Callao)',false,'Vereda este','crece hacia el norte; mirando al norte, la derecha es el este'],
    ['una calle norte-sur, al norte de Rivadavia (tipo Callao)',true,'Vereda oeste','crece hacia el norte; los pares quedan a la izquierda, al oeste'],
    ['una calle norte-sur, al sur de Rivadavia (tipo Entre Ríos)',false,'Vereda oeste','crece hacia el sur; mirando al sur, la derecha es el oeste'],
    ['una calle norte-sur, al sur de Rivadavia (tipo Entre Ríos)',true,'Vereda este','crece hacia el sur; los pares quedan a la izquierda, al este']];
  const c=rnd(casos); let num=(1+Math.floor(Math.random()*40))*100+1+2*Math.floor(Math.random()*45); if(c[1]) num++;
  return {key:null,prompt:`Estás en ${c[0]}, frente al <u>${num}</u>. ¿Qué vereda es?`,options:['Vereda norte','Vereda sur','Vereda este','Vereda oeste'],answer:c[2],setup,
    explain:`En CABA, mirando hacia donde crece la numeración: impares a la derecha, pares a la izquierda. Acá ${c[3]}.`};
}
const ORI=[
 ['Desde el centro, ¿hacia dónde queda el Río de la Plata?',['Este','Oeste','Sur','Norte'],'Este','Está al este (un poco noreste). Es tu referencia número uno.'],
 ['¿Qué separa la ciudad de la provincia por el sur?',['El Riachuelo','La General Paz','La Av. Rivadavia','El arroyo Maldonado'],'El Riachuelo','El Riachuelo es el límite sur; la General Paz cierra por oeste y norte.'],
 ['Al mediodía, ¿dónde está el sol en Buenos Aires?',['Hacia el norte','Hacia el sur','Justo arriba siempre','Hacia el este'],'Hacia el norte','En el hemisferio sur el sol del mediodía está al norte: tu sombra apunta al sur.'],
 ['¿Qué dos avenidas cruzan Rivadavia sin cambiar de nombre?',['9 de Julio y General Paz','Callao y Pueyrredón','Corrientes y Santa Fe','Libertador y Alem'],'9 de Julio y General Paz','Casi todas las demás cambian de nombre al cruzarla.'],
 ['En el centro, si la calle va en bajada, ¿hacia dónde vas?',['Hacia el río (este)','Hacia el oeste','Hacia el Riachuelo','No indica nada'],'Hacia el río (este)','La ciudad está sobre una barranca; el Bajo (Alem / Paseo Colón) era la vieja orilla.'],
 ['¿Por dónde pasaba más o menos la vieja orilla del río?',['Paseo Colón y Alem','La 9 de Julio','Av. Callao','Av. Pueyrredón'],'Paseo Colón y Alem','Puerto Madero se construyó sobre tierra ganada al río.'],
 ['¿Cuántos barrios tiene la Ciudad?',['48','100','36','15'],'48','Son 48 barrios agrupados en 15 comunas.'],
 ['¿Cuántos números tiene una cuadra porteña?',['100','50','200','Depende del barrio'],'100','La altura dividida por 100 te dice cuántas cuadras recorriste.'],
 ['Las calles este-oeste, ¿desde dónde se numeran?',['Del lado del río','Desde la General Paz','Desde Rivadavia','Desde el Riachuelo'],'Del lado del río','Arrancan del este y crecen hacia el oeste.'],
 ['Las calles norte-sur, ¿desde dónde se numeran?',['Desde Rivadavia, hacia los dos lados','Desde el río','Desde la General Paz','Desde el Riachuelo'],'Desde Rivadavia, hacia los dos lados','Rivadavia es el 0.'],
 ['¿Debajo de qué avenida va la línea B?',['Corrientes','Rivadavia','Santa Fe','San Juan'],'Corrientes','La B va por Corrientes y después por Triunvirato.'],
 ['¿Qué línea va por Santa Fe y Cabildo?',['D','A','E','H'],'D','La D: Diagonal Norte, Córdoba, Santa Fe y Cabildo.'],
 ['Pueyrredón, al cruzar Rivadavia hacia el sur, se llama…',['Jujuy','Entre Ríos','Boedo','La Plata'],'Jujuy','Y la línea H va justo por debajo de las dos.'],
 ['¿Qué avenida parte la ciudad en norte y sur?',['Rivadavia','Corrientes','9 de Julio','Juan B. Justo'],'Rivadavia','Es el eje de nombres y numeración.'],
 ['¿Sobre qué arroyo entubado corre la Av. Juan B. Justo?',['Maldonado','Medrano','Vega','Cildáñez'],'Maldonado','El Maldonado va entubado debajo de Juan B. Justo.'],
];
function qOrientacion(){
  const o=pickWeighted(ORI,o=>'o:'+o[0]);
  return {key:'o:'+o[0],prompt:o[0],options:shuffle(o[1]),answer:o[2],explain:o[3],setup(){ capas({barrios:true,labels:true,av:true}); }};
}

ir('aprender');
})();
