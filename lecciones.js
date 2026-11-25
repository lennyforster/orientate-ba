// Contenido didáctico. "accion" le dice al mapa qué mostrar.
window.LECCIONES = [
{id:'bordes', emoji:'🧱', titulo:'1. Los bordes de la ciudad', accion:'bordes', html:`
<p>Antes de las calles, aprendete <b>la caja</b> donde está todo:</p>
<ul>
<li><b>Río de la Plata</b>: al este (un poco noreste). Es tu referencia número uno.</li>
<li><b>Riachuelo</b>: al sur. Separa la ciudad de la provincia (Avellaneda, Lanús…).</li>
<li><b>Av. General Paz</b>: cierra la ciudad por el oeste y el norte.</li>
</ul>
<p>Si sabés para qué lado está el río, ya sabés dónde está el este.</p>`},
{id:'rivadavia', emoji:'📏', titulo:'2. Rivadavia, la columna', accion:'rivadavia', html:`
<p>La Av. <b>Rivadavia</b> sale de Plaza de Mayo y cruza toda la ciudad hacia el oeste. <b>Parte la ciudad en norte y sur.</b></p>
<ul>
<li>Casi todas las calles que la cruzan <b>cambian de nombre</b> y <b>arrancan su numeración en 0</b> ahí.</li>
<li>Las únicas dos que la cruzan sin cambiar de nombre: <b>9 de Julio</b> y <b>General Paz</b>.</li>
</ul>
<p class="mute">Truco: si una calle "norte-sur" tiene numeración baja, estás cerca de Rivadavia.</p>`},
{id:'numeracion', emoji:'🔢', titulo:'3. La numeración te dice dónde estás', accion:'numeracion', html:`
<ul>
<li><b>Cada cuadra son 100 números.</b> De Corrientes 1500 a Corrientes 3500 hay 20 cuadras.</li>
<li>Calles <b>este-oeste</b> (Corrientes, Santa Fe, San Juan…): la numeración arranca del lado del río y <b>crece hacia el oeste</b>.</li>
<li>Calles <b>norte-sur</b> (Callao, Pueyrredón…): arrancan en <b>Rivadavia</b> y crecen hacia los dos lados.</li>
</ul>
<p>Entonces: "Pueyrredón 1200" = unas 12 cuadras al norte de Rivadavia. "Corrientes 5000" = unas 50 cuadras del Bajo, hacia el oeste.</p>`},
{id:'paridad', emoji:'🚪', titulo:'4. Pares e impares: la brújula de las puertas', accion:null, html:`
<p>En CABA: <b>mirando hacia donde crece la numeración, los impares quedan a la derecha y los pares a la izquierda.</b></p>
<ul>
<li>Calle <b>este-oeste</b> (crece al oeste): impares = <b>vereda norte</b>, pares = vereda sur.</li>
<li>Calle <b>norte-sur, al norte de Rivadavia</b> (crece al norte): impares = <b>vereda este</b> (lado del río).</li>
<li>Calle <b>norte-sur, al sur de Rivadavia</b> (crece al sur): impares = <b>vereda oeste</b>.</li>
</ul>
<p>Mirás el número de una puerta, sabés para qué lado crece la calle, y te orientás sin celular.</p>`},
{id:'nombres', emoji:'🔀', titulo:'5. Calles que cambian de nombre en Rivadavia', accion:'pares', html:`
<p>"Convertir Piedras en Esmeralda" es el chiste porteño: Piedras (sur) se llama Esmeralda al cruzar Rivadavia (norte). Las del centro, de este a oeste:</p>
<table class="pairs">
<tr><td class="mute">Al norte</td><td class="mute">Al sur</td></tr>
<tr><td>San Martín</td><td>Bolívar</td></tr>
<tr><td>Florida</td><td>Perú</td></tr>
<tr><td>Maipú</td><td>Chacabuco</td></tr>
<tr><td>Esmeralda</td><td>Piedras</td></tr>
<tr><td>Suipacha</td><td>Tacuarí</td></tr>
<tr><td>Carlos Pellegrini</td><td>Bernardo de Irigoyen</td></tr>
<tr><td>Cerrito</td><td>Lima</td></tr>
<tr><td>Libertad</td><td>Salta</td></tr>
<tr><td>Talcahuano</td><td>Santiago del Estero</td></tr>
<tr><td>Montevideo</td><td>Virrey Cevallos</td></tr>
<tr><td><b>Callao</b></td><td><b>Entre Ríos</b></td></tr>
<tr><td><b>Pueyrredón</b></td><td><b>Jujuy</b></td></tr>
</table>
<p class="mute">Pellegrini/Irigoyen y Cerrito/Lima son las calzadas laterales de la 9 de Julio.</p>`},
{id:'poligonos', emoji:'🧩', titulo:'6. No es solo Rivadavia: los polígonos', accion:'reinicia', html:`
<p>Una norma de 1904 dividió la ciudad en polígonos con numeración propia, para que las calles no tuvieran números gigantes. Sus bordes son <b>Rivadavia, Río de Janeiro, Ángel Gallardo, Warnes, Dorrego y el río</b>. Después se sumó Puerto Madero.</p>
<p>Por eso algunas calles también cambian de nombre o reinician la numeración al cruzar esas avenidas (con muchas excepciones).</p>
<p class="mute">Fijate en el mapa: forman una línea que va de Rivadavia hacia el norte, cruzando Almagro, Villa Crespo y Palermo.</p>`},
{id:'avenidas', emoji:'🛣️', titulo:'7. Las avenidas esqueleto', accion:'nivel1', html:`
<p><b>Este-oeste</b>, de norte a sur: Santa Fe · Córdoba · Corrientes · Rivadavia · Av. de Mayo · Independencia · San Juan.</p>
<p><b>Norte-sur</b>, del río hacia el oeste: Alem / Paseo Colón (la vieja orilla) · 9 de Julio · Callao / Entre Ríos · Pueyrredón / Jujuy.</p>
<p><b>Hacia el norte</b>, paralelas al río: Del Libertador, Figueroa Alcorta, y Santa Fe que sigue como Cabildo.</p>
<p class="mute">Con estas ~15 ya podés ubicar casi cualquier lugar del centro.</p>`},
{id:'subte', emoji:'🚇', titulo:'8. El subte es un mapa de avenidas', accion:'subte', html:`
<ul>
<li><span class="pill" style="background:#19a9e0;color:#fff">A</span> Av. de Mayo y Rivadavia, hacia el oeste (Flores).</li>
<li><span class="pill" style="background:#e2231a;color:#fff">B</span> Corrientes y después Triunvirato (Villa Urquiza).</li>
<li><span class="pill" style="background:#1a5fb4;color:#fff">C</span> Norte-sur: Retiro ↔ Constitución, cerca de la 9 de Julio.</li>
<li><span class="pill" style="background:#009b3a;color:#fff">D</span> Diagonal Norte, Córdoba, Santa Fe y Cabildo (hacia el norte).</li>
<li><span class="pill" style="background:#7b3f98;color:#fff">E</span> Del centro por San Juan y después Directorio (sudoeste).</li>
<li><span class="pill" style="background:#f5c400;color:#222">H</span> Norte-sur por Pueyrredón y Jujuy.</li>
</ul>
<p>Si sabés en qué línea estás, sabés debajo de qué avenida vas.</p>
<p class="mute">Las líneas del mapa unen estaciones en línea recta: el recorrido real sigue las calles.</p>`},
{id:'barranca', emoji:'⛰️', titulo:'9. La barranca: la vieja costa', accion:'barranca', html:`
<p>La ciudad se fundó arriba de una barranca. La orilla original del río pasaba más o menos por donde hoy están <b>Paseo Colón y Leandro N. Alem</b> (el "Bajo").</p>
<ul>
<li>Plaza San Martín (Retiro) y Parque Lezama (San Telmo) están <b>arriba de la barranca</b>.</li>
<li>Puerto Madero está sobre tierra ganada al río para el puerto de fines del siglo XIX.</li>
</ul>
<p>En el centro: <b>si la calle baja, vas hacia el río (este)</b>.</p>`},
{id:'sol', emoji:'☀️', titulo:'10. Orientarte con el sol', accion:null, html:`
<ul>
<li>Estamos en el hemisferio sur: <b>al mediodía el sol está al norte</b>. Tu sombra apunta al sur.</li>
<li>A la mañana el sol viene del lado del río (este); a la tarde se pone hacia la provincia (oeste).</li>
</ul>
<p>Combinado: a la tarde, si caminás hacia el sol, te alejás del río.</p>`},
{id:'barrios', emoji:'🏘️', titulo:'11. 48 barrios en 4 zonas', accion:'barrios', html:`
<p>La ciudad tiene <b>48 barrios</b> agrupados en <b>15 comunas</b>. Para empezar, pensalos en zonas:</p>
<ul>
<li><b>Centro / costa</b>: Retiro, San Nicolás, Monserrat, San Telmo, Puerto Madero, Constitución.</li>
<li><b>Norte</b> (siguiendo el río): Recoleta, Palermo, Colegiales, Belgrano, Núñez, Saavedra.</li>
<li><b>Sur</b> (siguiendo el Riachuelo): La Boca, Barracas, Parque Patricios, Nueva Pompeya, Villa Soldati, Villa Lugano.</li>
<li><b>Oeste</b> (siguiendo Rivadavia): Balvanera, Almagro, Caballito, Flores, Floresta, Vélez Sarsfield, Liniers.</li>
</ul>
<p class="mute">En Explorar tocá cualquier barrio para ver de dónde viene su nombre y con quién limita.</p>`},
{id:'calle', emoji:'🚶', titulo:'12. Cómo practicar en la calle', accion:null, html:`
<ul>
<li><b>Antes de salir</b> mirá el mapa 30 segundos y guardate 2 o 3 referencias ("Independencia hasta Entre Ríos y doblo al norte").</li>
<li><b>Guardá el celular.</b> Sacalo solo si te perdés.</li>
<li>Si usás el GPS, ponelo con <b>el norte fijo arriba</b>, no girando con vos.</li>
<li><b>Predecí</b> la altura de cada esquina antes de leer el cartel.</li>
<li>Caminá o andá en bici: en subte la ciudad se "teletransporta" y no se arma el mapa.</li>
</ul>
<p class="mute">Un estudio de McGill (2020) encontró que quienes usaban más GPS tenían peor memoria espacial al navegar sin él.</p>`}
];
