/**
 * Red de zonas del área metropolitana de Caracas y el eje Guarenas–Guatire.
 *
 * Coordenadas reales aproximadas. El mapa se dibuja en SVG a partir de
 * este grafo, sin proveedor de mapas ni clave de API: para el demo
 * alcanza, no agrega costo ni dependencias.
 */

export interface Zone {
  id: string;
  name: string;
  short: string;
  lat: number;
  lng: number;
  /** Agrupación para mostrar en los selectores */
  area: 'Este metropolitano' | 'Caracas centro' | 'Caracas este' | 'Caracas oeste' | 'Altos mirandinos' | 'Litoral';
}

export const ZONES: Zone[] = [
  // Eje Guarenas–Guatire
  { id: 'guatire',    name: 'Guatire',            short: 'Guatire',    lat: 10.4739, lng: -66.5411, area: 'Este metropolitano' },
  { id: 'guarenas',   name: 'Guarenas',           short: 'Guarenas',   lat: 10.4683, lng: -66.6089, area: 'Este metropolitano' },
  { id: 'caucaguita', name: 'Caucagüita',         short: 'Caucagüita', lat: 10.4750, lng: -66.7300, area: 'Este metropolitano' },

  // Caracas este
  { id: 'petare',     name: 'Petare',             short: 'Petare',     lat: 10.4772, lng: -66.8078, area: 'Caracas este' },
  { id: 'dos-caminos',name: 'Los Dos Caminos',    short: 'Dos Caminos',lat: 10.4950, lng: -66.8450, area: 'Caracas este' },
  { id: 'los-palos',  name: 'Los Palos Grandes',  short: 'Palos Gdes', lat: 10.4972, lng: -66.8447, area: 'Caracas este' },
  { id: 'altamira',   name: 'Altamira',           short: 'Altamira',   lat: 10.4950, lng: -66.8530, area: 'Caracas este' },
  { id: 'chacao',     name: 'Chacao',             short: 'Chacao',     lat: 10.4967, lng: -66.8542, area: 'Caracas este' },
  { id: 'las-mercedes',name:'Las Mercedes',       short: 'Las Mercedes',lat:10.4783, lng: -66.8639, area: 'Caracas este' },
  { id: 'chacaito',   name: 'Chacaíto',           short: 'Chacaíto',   lat: 10.4980, lng: -66.8792, area: 'Caracas este' },

  // Caracas centro
  { id: 'sabana',     name: 'Sabana Grande',      short: 'Sabana Gde', lat: 10.4917, lng: -66.8792, area: 'Caracas centro' },
  { id: 'bellas-artes',name:'Bellas Artes',       short: 'Bellas Artes',lat:10.5011, lng: -66.8931, area: 'Caracas centro' },
  { id: 'centro',     name: 'Centro de Caracas',  short: 'Centro',     lat: 10.5061, lng: -66.9146, area: 'Caracas centro' },
  { id: 'la-candelaria',name:'La Candelaria',     short: 'Candelaria', lat: 10.5064, lng: -66.9019, area: 'Caracas centro' },

  // Caracas oeste
  { id: 'catia',      name: 'Catia',              short: 'Catia',      lat: 10.5122, lng: -66.9450, area: 'Caracas oeste' },
  { id: 'el-paraiso', name: 'El Paraíso',         short: 'El Paraíso', lat: 10.4900, lng: -66.9350, area: 'Caracas oeste' },
  { id: 'la-vega',    name: 'La Vega',            short: 'La Vega',    lat: 10.4744, lng: -66.9394, area: 'Caracas oeste' },

  // Altos mirandinos
  { id: 'los-teques', name: 'Los Teques',         short: 'Los Teques', lat: 10.3417, lng: -67.0417, area: 'Altos mirandinos' },
  { id: 'san-antonio',name: 'San Antonio',        short: 'San Antonio',lat: 10.3336, lng: -66.9539, area: 'Altos mirandinos' },

  // Litoral
  { id: 'la-guaira',  name: 'La Guaira',          short: 'La Guaira',  lat: 10.6000, lng: -66.9333, area: 'Litoral' },
  { id: 'maiquetia',  name: 'Maiquetía',          short: 'Maiquetía',  lat: 10.5983, lng: -66.9811, area: 'Litoral' },
];

export function zoneById(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

export function zoneByName(name: string): Zone | undefined {
  return ZONES.find((z) => z.name === name);
}

/** Zonas agrupadas por área, para los selectores. */
export function zonesByArea(): Record<string, Zone[]> {
  return ZONES.reduce((acc, z) => {
    (acc[z.area] ||= []).push(z);
    return acc;
  }, {} as Record<string, Zone[]>);
}

/**
 * Puntos intermedios conocidos entre pares de zonas.
 * Si un par no está listado, se traza la ruta directa.
 */
const VIA: Record<string, string[]> = {
  'guatire|chacaito':   ['guarenas', 'caucaguita', 'petare', 'dos-caminos'],
  'guatire|centro':     ['guarenas', 'caucaguita', 'petare', 'chacaito', 'sabana'],
  'guatire|chacao':     ['guarenas', 'caucaguita', 'petare', 'dos-caminos'],
  'guatire|altamira':   ['guarenas', 'caucaguita', 'petare', 'dos-caminos'],
  'guatire|las-mercedes':['guarenas', 'caucaguita', 'petare', 'chacaito'],
  'guatire|catia':      ['guarenas', 'caucaguita', 'petare', 'chacaito', 'centro'],
  'guarenas|chacaito':  ['caucaguita', 'petare', 'dos-caminos'],
  'guarenas|centro':    ['caucaguita', 'petare', 'chacaito', 'sabana'],
  'guarenas|chacao':    ['caucaguita', 'petare', 'dos-caminos'],
  'petare|centro':      ['dos-caminos', 'chacaito', 'sabana'],
  'petare|catia':       ['chacaito', 'centro'],
  'los-teques|centro':  ['san-antonio', 'el-paraiso'],
  'los-teques|chacaito':['san-antonio', 'el-paraiso', 'sabana'],
  'la-guaira|centro':   ['maiquetia', 'catia'],
  'la-guaira|chacaito': ['maiquetia', 'catia', 'centro', 'sabana'],
  'maiquetia|centro':   ['catia'],
  'catia|petare':       ['centro', 'chacaito', 'dos-caminos'],
};

export interface RoutePoint extends Zone {
  minute: number;
}

/** Distancia aproximada en km entre dos zonas (fórmula del haversine). */
function distanceKm(a: Zone, b: Zone): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Arma la ruta entre dos zonas con sus puntos intermedios y
 * estima el minuto de paso por cada uno (~28 km/h de promedio urbano).
 */
export function buildRoute(originName: string, destinationName: string): RoutePoint[] {
  const a = zoneByName(originName) || ZONES[0];
  const b = zoneByName(destinationName) || ZONES[ZONES.length - 1];

  const key = `${a.id}|${b.id}`;
  const reverseKey = `${b.id}|${a.id}`;
  let viaIds = VIA[key];
  if (!viaIds && VIA[reverseKey]) viaIds = [...VIA[reverseKey]].reverse();

  const via = (viaIds || []).map(zoneById).filter(Boolean) as Zone[];
  const chain = [a, ...via, b];

  const AVG_KMH = 28;
  let acc = 0;
  return chain.map((z, i) => {
    if (i > 0) acc += (distanceKm(chain[i - 1], z) / AVG_KMH) * 60;
    return { ...z, minute: Math.round(acc) };
  });
}

export function routeDuration(points: RoutePoint[]): number {
  return points[points.length - 1].minute;
}

export function routeDistanceKm(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceKm(points[i - 1], points[i]);
  return +total.toFixed(1);
}

/** Proyecta lat/lng al lienzo SVG. */
export function project(points: RoutePoint[], width: number, height: number, pad = 40) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;

  return points.map((p) => ({
    ...p,
    x: pad + ((p.lng - minLng) / spanLng) * (width - pad * 2),
    y: height - pad - ((p.lat - minLat) / spanLat) * (height - pad * 2),
  }));
}

/** Precio sugerido según la distancia — ayuda al conductor a poner precio. */
export function suggestedPrice(originName: string, destinationName: string): number {
  const km = routeDistanceKm(buildRoute(originName, destinationName));
  return Math.max(2, Math.round(km * 0.35 * 2) / 2);
}
