import type { MonthPoint } from '../../lib/metrics';

/**
 * Gráfico de crecimiento en SVG a mano — sin librerías de charts.
 *
 * Barras de viajes por mes con la línea de GMV encima. Se dibuja en el
 * servidor, así que no agrega ni un kilobyte de JavaScript al cliente.
 */
const W = 680;
const H = 240;
const PAD_X = 34;
const PAD_TOP = 24;
const PAD_BOTTOM = 34;

export default function GrowthChart({ series }: { series: MonthPoint[] }) {
  const maxTrips = Math.max(...series.map((m) => m.trips));
  const maxGmv = Math.max(...series.map((m) => m.gmv));

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const slot = innerW / series.length;
  const barW = Math.min(slot * 0.52, 46);

  const bars = series.map((m, i) => {
    const h = (m.trips / maxTrips) * innerH;
    return {
      ...m,
      x: PAD_X + slot * i + (slot - barW) / 2,
      y: PAD_TOP + innerH - h,
      h,
      cx: PAD_X + slot * i + slot / 2,
      cy: PAD_TOP + innerH - (m.gmv / maxGmv) * innerH,
    };
  });

  const line = bars.map((b) => `${b.cx},${b.cy}`).join(' ');

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span className="legend-bar">Viajes por mes</span>
        <span className="legend-line">GMV (USD)</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={`Crecimiento mensual: de ${series[0].trips} viajes en ${series[0].label} a ${
          series[series.length - 1].trips
        } en ${series[series.length - 1].label}`}
      >
        <defs>
          <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Líneas guía horizontales */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + innerH * f}
            y2={PAD_TOP + innerH * f}
            stroke="#2C3743"
            strokeWidth="1"
            strokeDasharray={f === 1 ? '0' : '3 5'}
          />
        ))}

        {/* Barras de viajes */}
        {bars.map((b) => (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.y}
              width={barW}
              height={Math.max(b.h, 2)}
              rx="5"
              fill="url(#barG)"
            />
            <text
              x={b.cx}
              y={b.y - 7}
              textAnchor="middle"
              className="chart-value"
            >
              {b.trips.toLocaleString('es-VE')}
            </text>
            <text
              x={b.cx}
              y={H - 12}
              textAnchor="middle"
              className="chart-label"
            >
              {b.label}
            </text>
          </g>
        ))}

        {/* Línea de GMV */}
        <polyline
          points={line}
          fill="none"
          stroke="#F5B841"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {bars.map((b) => (
          <circle
            key={`p-${b.label}`}
            cx={b.cx}
            cy={b.cy}
            r="4"
            fill="#0F1419"
            stroke="#F5B841"
            strokeWidth="2.5"
          />
        ))}
      </svg>
    </div>
  );
}
