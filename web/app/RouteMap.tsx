'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildRoute,
  routeDuration,
  routeDistanceKm,
  roadLine,
} from '../lib/route';

/**
 * Mapa real: mosaicos de OpenStreetMap + el trazado de la carretera.
 *
 * David pidió "un mapa didáctico real si se puede". Sí se puede, y sin
 * pagar ni pedir clave a nadie:
 *
 * · **Los mosaicos** vienen de OpenStreetMap, que es abierto. Se
 *   piden como `<img>` sueltas, sin librería de mapas: Leaflet o
 *   Mapbox GL pesan entre 40 y 800 KB y acá no hacen falta porque el
 *   mapa no necesita arrastre libre ni zoom continuo.
 * · **El trazado** es la carretera de verdad, con sus curvas, sacado
 *   de OSRM y guardado en `lib/geometry.json`. Ver
 *   `scripts/fetch-routes.mjs`.
 *
 * Lo importante de esta decisión: **cero llamadas a servicios de pago,
 * cero claves de API y cero dependencias nuevas.** Los mosaicos los
 * pide el navegador del usuario directo a OSM y quedan en su caché.
 *
 * La proyección es Web Mercator, la misma que usan los mosaicos, así
 * que la línea cae exactamente sobre las calles.
 */

const TILE = 256;

/** Web Mercator: grados → coordenada de mosaico (la que usa OSM). */
function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  );
}

export default function RouteMap({
  origin,
  destination,
  live = false,
}: {
  origin: string;
  destination: string;
  live?: boolean;
}) {
  const route = buildRoute(origin, destination);
  const road = roadLine(origin, destination);

  // Con carretera real usamos sus km y minutos, que son los verdaderos.
  const km = road?.km ?? routeDistanceKm(route);
  const total = road?.minutes ?? routeDuration(route);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(live);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [tilesOk, setTilesOk] = useState(true);

  useEffect(() => setPlaying(live), [live]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.0035 * speed;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, 60);
    return () => clearInterval(timer);
  }, [playing, speed]);

  /**
   * Encuadre: elige el zoom más cercano donde la ruta entra completa,
   * y calcula qué mosaicos hacen falta. Todo derivado de los puntos,
   * así que sirve igual para un tramo de 9 km y para uno de 53.
   */
  const view = useMemo(() => {
    const W = 680;
    const H = 340;
    const PAD = 34;

    const coords: [number, number][] = road
      ? road.line
      : route.map((p) => [p.lng, p.lat]);

    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // Zoom más grande que todavía deja entrar la ruta con margen.
    let z = 15;
    while (z > 8) {
      const w = (lngToTileX(maxLng, z) - lngToTileX(minLng, z)) * TILE;
      const h = (latToTileY(minLat, z) - latToTileY(maxLat, z)) * TILE;
      if (w <= W - PAD * 2 && h <= H - PAD * 2) break;
      z--;
    }

    // Centro en coordenadas de mosaico, y de ahí el rectángulo a cubrir.
    const cx = (lngToTileX(minLng, z) + lngToTileX(maxLng, z)) / 2;
    const cy = (latToTileY(minLat, z) + latToTileY(maxLat, z)) / 2;

    const originX = cx * TILE - W / 2;
    const originY = cy * TILE - H / 2;

    const toPx = (lng: number, lat: number) => ({
      x: lngToTileX(lng, z) * TILE - originX,
      y: latToTileY(lat, z) * TILE - originY,
    });

    // Mosaicos que tocan el recuadro visible.
    const x0 = Math.floor(originX / TILE);
    const x1 = Math.floor((originX + W) / TILE);
    const y0 = Math.floor(originY / TILE);
    const y1 = Math.floor((originY + H) / TILE);
    const max = Math.pow(2, z) - 1;

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        if (ty < 0 || ty > max) continue;
        const wrapped = ((tx % (max + 1)) + max + 1) % (max + 1);
        tiles.push({
          key: `${z}/${tx}/${ty}`,
          url: `https://tile.openstreetmap.org/${z}/${wrapped}/${ty}.png`,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
        });
      }
    }

    const line = coords.map(([lng, lat]) => toPx(lng, lat));
    const stops = route.map((p) => ({ ...p, ...toPx(p.lng, p.lat) }));

    return { W, H, z, tiles, line, stops };
  }, [origin, destination, road, route]);

  const { W, H, tiles, line, stops } = view;
  const path = line.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Largo acumulado, para poder colocar el carro a una fracción exacta
  // del recorrido y no a una fracción del número de puntos (que con
  // puntos desiguales haría que el carro cambie de velocidad).
  const cum = useMemo(() => {
    const acc = [0];
    for (let i = 1; i < line.length; i++) {
      acc.push(
        acc[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
      );
    }
    return acc;
  }, [line]);

  const totalLen = cum[cum.length - 1] || 1;
  const target = progress * totalLen;

  let seg = 1;
  while (seg < cum.length - 1 && cum[seg] < target) seg++;
  const segLen = cum[seg] - cum[seg - 1] || 1;
  const t = Math.max(0, Math.min(1, (target - cum[seg - 1]) / segLen));
  const carX = line[seg - 1].x + (line[seg].x - line[seg - 1].x) * t;
  const carY = line[seg - 1].y + (line[seg].y - line[seg - 1].y) * t;

  const elapsed = Math.round(progress * total);
  const remaining = Math.max(total - elapsed, 0);
  const sel = selected !== null ? stops[selected] : null;

  return (
    <div className="map-wrap">
      <div className="map-head">
        <span className="map-route-name">
          {origin} → {destination}
        </span>
        <span className="map-facts">
          {km} km · {total} min
          {road && <em className="map-real"> · carretera real</em>}
        </span>
      </div>

      <div className="map-canvas" style={{ aspectRatio: `${W} / ${H}` }}>
        {/* Mosaicos de OpenStreetMap. Si no cargan (sin internet), el
            mapa sigue siendo legible: queda la línea sobre el fondo. */}
        {tilesOk && (
          <div className="map-tiles">
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                width={TILE}
                height={TILE}
                loading="lazy"
                onError={() => setTilesOk(false)}
                style={{
                  left: `${(tile.left / W) * 100}%`,
                  top: `${(tile.top / H) * 100}%`,
                  width: `${(TILE / W) * 100}%`,
                  height: `${(TILE / H) * 100}%`,
                }}
              />
            ))}
          </div>
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="map-svg"
          role="img"
          aria-label={`Recorrido de ${origin} a ${destination}: ${km} kilómetros, ${total} minutos`}
        >
          <defs>
            <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>

          {/* Contorno oscuro debajo: hace legible la línea verde sobre
              cualquier color del mapa. */}
          <polyline
            points={path}
            fill="none"
            stroke="rgba(9,13,18,0.55)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={path}
            fill="none"
            stroke="url(#road)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Tramo recorrido, encima, en color pleno. */}
          {progress > 0 && (
            <polyline
              points={path}
              fill="none"
              stroke="#22C55E"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={totalLen}
              strokeDashoffset={totalLen - progress * totalLen}
            />
          )}

          {stops.map((p, idx) => {
            const isEnd = idx === 0 || idx === stops.length - 1;
            const isSel = selected === idx;
            return (
              <g
                key={p.id}
                onClick={() => setSelected(isSel ? null : idx)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                {isSel && <circle cx={p.x} cy={p.y} r="13" fill="#16a34a" opacity="0.25" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isEnd ? 7 : 5}
                  fill={isEnd ? '#16a34a' : '#0F1419'}
                  stroke="#fff"
                  strokeWidth={isSel ? 3 : 2}
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  className="map-label"
                >
                  {p.short}
                </text>
              </g>
            );
          })}

          {progress > 0 && (
            <g transform={`translate(${carX}, ${carY})`}>
              <circle r="15" fill="#16a34a" opacity="0.3" />
              <circle r="9" fill="#16a34a" stroke="#fff" strokeWidth="2.5" />
              <text y="4" textAnchor="middle" fontSize="10">
                🚗
              </text>
            </g>
          )}
        </svg>

        {/* Atribución: OpenStreetMap es abierto pero pide crédito, y
            corresponde darlo. */}
        <a
          className="map-credit"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap
        </a>
      </div>

      {sel && (
        <div className="map-tip">
          <strong>{sel.name}</strong>
          <span>
            {sel.area} · minuto {sel.minute} del recorrido
          </span>
        </div>
      )}

      {/* Controles didácticos: recorrer el viaje a mano es lo que
          convierte el mapa en una explicación y no en una foto. */}
      <div className="map-controls">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '⏸ Pausar' : progress >= 1 ? '↻ Repetir' : '▶ Ver el recorrido'}
        </button>

        <input
          className="map-scrub"
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => {
            setPlaying(false);
            setProgress(Number(e.target.value) / 1000);
          }}
          aria-label="Avance del viaje"
        />

        <button
          className="map-speed"
          onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
          aria-label="Velocidad de la animación"
        >
          {speed}×
        </button>
      </div>

      {progress > 0 && (
        <div className="map-progress-facts">
          <span>
            <strong>{elapsed}</strong> min andados
          </span>
          <span>
            <strong>{remaining}</strong> min para llegar
          </span>
          <span>
            <strong>{Math.round(progress * 100)}%</strong> del camino
          </span>
        </div>
      )}
    </div>
  );
}
