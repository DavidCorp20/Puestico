/**
 * Geometría del corredor Guatire ↔ Caracas para el mapa simulado.
 *
 * Coordenadas reales aproximadas de la ruta (autopista Gran Mariscal de
 * Ayacucho). Se dibujan en SVG, sin proveedor de mapas ni clave de API:
 * para el demo alcanza y no agrega costo ni dependencias.
 */

export interface RoutePoint {
  name: string;
  lat: number;
  lng: number;
  /** Minuto estimado desde la salida */
  minute: number;
}

export const CORRIDOR: Record<string, RoutePoint[]> = {
  'Guatire→Caracas': [
    { name: 'Guatire', lat: 10.4739, lng: -66.5411, minute: 0 },
    { name: 'Guarenas', lat: 10.4683, lng: -66.6089, minute: 8 },
    { name: 'Peaje Caucagüita', lat: 10.4750, lng: -66.7300, minute: 22 },
    { name: 'Petare', lat: 10.4772, lng: -66.8078, minute: 34 },
    { name: 'Los Dos Caminos', lat: 10.4950, lng: -66.8450, minute: 42 },
    { name: 'Caracas (Chacaíto)', lat: 10.4980, lng: -66.8792, minute: 52 },
  ],
  'Guarenas→Caracas': [
    { name: 'Guarenas', lat: 10.4683, lng: -66.6089, minute: 0 },
    { name: 'Peaje Caucagüita', lat: 10.4750, lng: -66.7300, minute: 14 },
    { name: 'Petare', lat: 10.4772, lng: -66.8078, minute: 26 },
    { name: 'Caracas (Chacaíto)', lat: 10.4980, lng: -66.8792, minute: 44 },
  ],
  'Caracas→Guatire': [
    { name: 'Caracas (Chacaíto)', lat: 10.4980, lng: -66.8792, minute: 0 },
    { name: 'Los Dos Caminos', lat: 10.4950, lng: -66.8450, minute: 10 },
    { name: 'Petare', lat: 10.4772, lng: -66.8078, minute: 18 },
    { name: 'Peaje Caucagüita', lat: 10.4750, lng: -66.7300, minute: 30 },
    { name: 'Guarenas', lat: 10.4683, lng: -66.6089, minute: 44 },
    { name: 'Guatire', lat: 10.4739, lng: -66.5411, minute: 52 },
  ],
};

export function getRoute(origin: string, destination: string): RoutePoint[] {
  return (
    CORRIDOR[`${origin}→${destination}`] || CORRIDOR['Guatire→Caracas']
  );
}

/** Duración total estimada del recorrido, en minutos. */
export function routeDuration(points: RoutePoint[]): number {
  return points[points.length - 1].minute;
}

/**
 * Proyecta lat/lng a coordenadas del lienzo SVG.
 * Escala simple con márgenes; suficiente para un corredor corto.
 */
export function project(
  points: RoutePoint[],
  width: number,
  height: number,
  pad = 34,
) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  return points.map((p) => ({
    ...p,
    x: pad + ((p.lng - minLng) / spanLng) * (width - pad * 2),
    // El eje Y del SVG crece hacia abajo: invertimos la latitud.
    y: height - pad - ((p.lat - minLat) / spanLat) * (height - pad * 2),
  }));
}
