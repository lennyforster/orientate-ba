# Orientate — tu mapa mental de Buenos Aires

Web interactiva para aprender a moverte por la Ciudad de Buenos Aires sin GPS: lecciones cortas, un mapa para explorar y 12 minijuegos (barrios, vecinos, avenidas, subte, calles que cambian de nombre en Rivadavia, numeración y pares/impares, orientación).

Funciona como sitio estático (GitHub Pages). El progreso se guarda en el navegador.

## Fuentes de datos
- **Barrios (48)**: dataset oficial de barrios del GCBA (vía repo `VeroPi/dataAnalytics`).
- **Avenidas** y límite de la ciudad: geometría de OpenStreetMap (© colaboradores de OSM, ODbL), procesada por el proyecto `FAOlivieri/quien_carajo_fue`.
- **Origen de los nombres**: resumido de A. G. Piñeiro, *Barrios, calles y plazas de la Ciudad de Buenos Aires. Origen y razón de sus nombres* (Instituto Histórico de la Ciudad de Buenos Aires, 2008).
- **Estaciones de subte (90)**: dataset de estaciones del GCBA (vía repo `Popoliku/subteBuenosAires`). Las líneas se dibujan uniendo estaciones en línea recta.
- **Regla de pares/impares**: tutorial de numeración de la comunidad OpenStreetMap Argentina.
- **Polígonos de numeración (1904)**: nota de C5N sobre las calles que cambian de nombre.
- Mapa base: OpenFreeMap (estilo Liberty, datos © OpenStreetMap). Librería: MapLibre GL. 

Las calles que cambian de nombre al cruzar Rivadavia se verificaron con la geometría de OSM (los extremos de cada par coinciden en la esquina).
