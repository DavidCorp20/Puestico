'use client';

import { useEffect, useState } from 'react';
import { buildRoute, project, routeDuration, routeDistanceKm } from '../lib/route';

const W = 680;
const H = 300;

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
  const points = project(route, W, H);
  const total = routeDuration(route);
  const km = routeDistanceKm(route);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(live);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

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

  const path = points.map((p) => `${p.x},${p.y}`).join(' ');
  const segs = points.length - 1;
  const pos = Math.min(progress * segs, segs);
  const i = Math.min(Math.floor(pos), segs - 1);
  const t = pos - i;
  const carX = points[i].x + (points[i + 1].x - points[i].x) * t;
  const carY = points[i].y + (points[i + 1].y - points[i].y) * t;

  const elapsed = Math.round(progress * total);
  const remaining = Math.max(total - elapsed, 0);
  const nextStop = points[Math.min(i + 1, points.length - 1)];
  const sel = selected !== null ? points[selected] : null;

  // Longitud aproximada del trazado, para animar el avance
  let len = 0;
  for (let k = 1; k < points.length; k++) {
    len += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y);
  }

  return (
    <div className="map-wrap">
      <div className="map-head">
        <span className="map-route-name">
          {origin} → {destination}
        </span>
        <span className="map-facts">
          {km} km · {total} min · {points.length} paradas
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img"
        aria-label={`Recorrido de ${origin} a ${destination}`}>
        <defs>
          <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke="#1d2530" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#grid)" />

        <polyline points={path} fill="none" stroke="#2f3945" strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={path}
          fill="none"
          stroke="url(#road)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len - progress * len}
        />

        {points.map((p, idx) => {
          const passed = idx <= i && progress > 0;
          const isEnd = idx === 0 || idx === points.length - 1;
          const isSel = selected === idx;
          return (
            <g key={p.id} onClick={() => setSelected(isSel ? null : idx)}
              style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
              {isSel && <circle cx={p.x} cy={p.y} r="13" fill="#16a34a" opacity="0.2" />}
              <circle
                cx={p.x}
                cy={p.y}
                r={isEnd ? 7.5 : 5.5}
                fill={passed ? '#16a34a' : '#151b23'}
                stroke={isSel ? '#4ade80' : isEnd ? '#e8edf2' : '#98a5b3'}
                strokeWidth={isSel ? 3 : 2}
              />
              <text x={p.x} y={p.y - 15} textAnchor="middle" className="map-label">
                {p.short}
              </text>
            </g>
          );
        })}

        {progress > 0 && (
          <g transform={`translate(${carX}, ${carY})`}>
            <circle r="15" fill="#16a34a" opacity="0.22" />
            <circle r="9" fill="#16a34a" stroke="#fff" strokeWidth="2" />
            <text y="4" textAnchor="middle" fontSize="10">🚗</text>
          </g>
        )}
      </svg>

      {sel && (
        <div className="map-tip">
          <strong>{sel.name}</strong>
          <span>
            {sel.area} · minuto {sel.minute} del recorrido
          </span>
        </div>
      )}

      <div className="map-controls">
        <button
          type="button"
          className="btn-mini"
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying(!playing);
          }}
        >
          {playing ? '⏸ Pausar' : progress >= 1 ? '↻ Repetir' : '▶ Simular viaje'}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={progress}
          onChange={(e) => {
            setPlaying(false);
            setProgress(Number(e.target.value));
          }}
          className="map-range"
          aria-label="Avance del viaje"
        />

        <select
          className="map-speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="Velocidad"
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
      </div>

      <div className="map-status">
        <div>
          <strong>{remaining} min</strong>
          <small>para llegar</small>
        </div>
        <div>
          <strong>{nextStop.short}</strong>
          <small>próximo punto</small>
        </div>
        <div>
          <strong>{Math.round(progress * 100)}%</strong>
          <small>recorrido</small>
        </div>
      </div>

      <p className="map-hint">Tocá cualquier parada del mapa para ver su detalle.</p>
    </div>
  );
}
