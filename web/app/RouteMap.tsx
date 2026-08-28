'use client';

import { useEffect, useState } from 'react';
import { getRoute, project, routeDuration } from '../lib/route';

const W = 660;
const H = 260;

/**
 * Mapa simulado del recorrido.
 *
 * Dibuja el corredor en SVG y, si `live` está activo, mueve el vehículo
 * a lo largo de la ruta. No usa proveedor de mapas: evita clave de API
 * y costo, que es lo que necesitamos para el demo.
 */
export default function RouteMap({
  origin,
  destination,
  live = false,
  speed = 1,
}: {
  origin: string;
  destination: string;
  live?: boolean;
  speed?: number;
}) {
  const points = project(getRoute(origin, destination), W, H);
  const total = routeDuration(getRoute(origin, destination));
  const [progress, setProgress] = useState(0); // 0..1

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      setProgress((p) => (p >= 1 ? 0 : +(p + 0.004 * speed).toFixed(4)));
    }, 60);
    return () => clearInterval(timer);
  }, [live, speed]);

  // Posición del vehículo interpolando entre los puntos de la ruta
  const path = points.map((p) => `${p.x},${p.y}`).join(' ');
  const segs = points.length - 1;
  const pos = progress * segs;
  const i = Math.min(Math.floor(pos), segs - 1);
  const t = pos - i;
  const carX = points[i].x + (points[i + 1].x - points[i].x) * t;
  const carY = points[i].y + (points[i + 1].y - points[i].y) * t;

  const elapsed = Math.round(progress * total);
  const remaining = Math.max(total - elapsed, 0);
  const nextStop = points[Math.min(i + 1, points.length - 1)];

  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img"
        aria-label={`Recorrido de ${origin} a ${destination}`}>
        <defs>
          <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Trazado base */}
        <polyline
          points={path}
          fill="none"
          stroke="#2f3945"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tramo recorrido */}
        <polyline
          points={path}
          fill="none"
          stroke="url(#road)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000"
          strokeDashoffset={live ? 1000 - progress * 1000 : 0}
          opacity={live ? 1 : 0.85}
        />

        {/* Paradas */}
        {points.map((p, idx) => {
          const passed = live && idx <= i;
          const isEnd = idx === 0 || idx === points.length - 1;
          return (
            <g key={p.name}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isEnd ? 7 : 5}
                fill={passed || !live ? '#16a34a' : '#1a2028'}
                stroke={isEnd ? '#e8edf2' : '#98a5b3'}
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={p.y - 14}
                textAnchor="middle"
                className="map-label"
              >
                {p.name}
              </text>
            </g>
          );
        })}

        {/* Vehículo */}
        {live && (
          <g transform={`translate(${carX}, ${carY})`}>
            <circle r="13" fill="#16a34a" opacity="0.25" />
            <circle r="8" fill="#16a34a" stroke="#fff" strokeWidth="2" />
            <text y="4.5" textAnchor="middle" fontSize="9">🚗</text>
          </g>
        )}
      </svg>

      {live && (
        <div className="map-status">
          <div>
            <strong>{remaining} min</strong>
            <small>para llegar</small>
          </div>
          <div>
            <strong>{nextStop.name}</strong>
            <small>próximo punto</small>
          </div>
          <div>
            <strong>{Math.round(progress * 100)}%</strong>
            <small>del recorrido</small>
          </div>
        </div>
      )}
    </div>
  );
}
