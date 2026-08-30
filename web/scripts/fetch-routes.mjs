/**
 * Descarga la geometría REAL de las carreteras para cada par de zonas
 * que usan los viajes, y la guarda en lib/geometry.ts.
 *
 * Por qué en un archivo y no en vivo:
 *  · el mapa no debe depender de que un servicio externo responda;
 *  · las rutas del corredor no cambian de un día para otro;
 *  · cero llamadas en tiempo de ejecución = cero costo y cero latencia.
 *
 * Usa OSRM público (sin clave, sin cuenta). Se corre a mano cuando se
 * agregan zonas nuevas: `node scripts/fetch-routes.mjs`
 */

import { writeFileSync } from 'node:fs';
import { ZONES } from '../lib/route.ts';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Reduce la cantidad de puntos conservando la forma (Douglas-Peucker).
 * 700 puntos por ruta pesan de más para dibujar una línea en pantalla;
 * con tolerancia de ~15 m la curva se ve idéntica y baja a ~80.
 */
function simplify(points, tolerance) {
  if (points.length <= 2) return points;

  const [start] = points;
  const end = points[points.length - 1];

  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist <= tolerance) return [start, end];

  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function perpendicularDistance(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const cx = x1 + Math.max(0, Math.min(1, t)) * dx;
  const cy = y1 + Math.max(0, Math.min(1, t)) * dy;
  return Math.hypot(x - cx, y - cy);
}

/** Pares que de verdad se usan: los que aparecen en los viajes. */
const PAIRS = [
  ['Guatire', 'Chacaíto'], ['Guatire', 'Chacao'], ['Guatire', 'Las Mercedes'],
  ['Guatire', 'Altamira'], ['Guatire', 'Centro de Caracas'], ['Guatire', 'Catia'],
  ['Guarenas', 'Altamira'], ['Guarenas', 'Chacaíto'], ['Guarenas', 'Centro de Caracas'],
  ['Los Teques', 'Centro de Caracas'], ['Los Teques', 'Chacaíto'],
  ['La Guaira', 'Centro de Caracas'], ['Maiquetía', 'Centro de Caracas'],
  ['Petare', 'Catia'], ['Petare', 'Centro de Caracas'], ['Petare', 'Chacaíto'],
  ['Chacaíto', 'Guatire'], ['Centro de Caracas', 'Guatire'],
  ['San Antonio', 'Chacaíto'], ['Caucagüita', 'Chacaíto'],
];

const zoneByName = (n) => ZONES.find((z) => z.name === n);
const out = {};
let ok = 0;
let fail = 0;

for (const [from, to] of PAIRS) {
  const a = zoneByName(from);
  const b = zoneByName(to);
  if (!a || !b) {
    console.log(`  ✗ zona desconocida: ${from} → ${to}`);
    fail++;
    continue;
  }

  const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Puestico/1.0 (piloto Guatire-Caracas)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('sin ruta');

    // ~0.00015° ≈ 15 m: la curva se ve igual con una fracción de los puntos.
    const full = route.geometry.coordinates;
    const slim = simplify(full, 0.00015);

    out[`${a.id}|${b.id}`] = {
      km: +(route.distance / 1000).toFixed(1),
      minutes: Math.round(route.duration / 60),
      // [lng, lat] redondeado a 5 decimales (~1 m): más precisión es peso muerto.
      line: slim.map(([lng, lat]) => [+lng.toFixed(5), +lat.toFixed(5)]),
    };

    console.log(
      `  ✓ ${from} → ${to}: ${(route.distance / 1000).toFixed(1)} km, ` +
        `${Math.round(route.duration / 60)} min, ${full.length}→${slim.length} puntos`,
    );
    ok++;
  } catch (e) {
    console.log(`  ✗ ${from} → ${to}: ${e.message}`);
    fail++;
  }

  // OSRM público es cortesía de alguien más: no lo martillamos.
  await new Promise((r) => setTimeout(r, 350));
}

// Se escribe como módulo TypeScript y no como .json porque Node exige
// `with { type: 'json' }` para importar JSON y Next no lo acepta: un
// .json obliga a elegir entre que compile la app o que corran las
// pruebas. Un .ts funciona en los dos.
const header = `/**
 * Trazado real de las carreteras del corredor — GENERADO, no editar a mano.
 *
 * Se regenera con \`node scripts/fetch-routes.mjs\`, que consulta OSRM
 * (datos de OpenStreetMap) y simplifica la curva a ~15 m de tolerancia.
 */

export interface RoadGeometry {
  km: number;
  minutes: number;
  /** Pares [lng, lat] a lo largo de la carretera. */
  line: [number, number][];
}

export const GEOMETRY: Record<string, RoadGeometry> = `;

writeFileSync(
  new URL('../lib/geometry.ts', import.meta.url),
  header + JSON.stringify(out) + ';\n',
);

console.log(`\n${ok} rutas guardadas, ${fail} fallidas.`);
