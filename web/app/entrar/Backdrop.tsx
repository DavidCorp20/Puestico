/**
 * Telón del ingreso — SEGUNDA VERSIÓN, rehecha entera.
 *
 * La primera era la montaña y una línea de puntos: correcta y muerta.
 * David dijo que le seguíamos entregando lo mismo y tenía razón.
 *
 * Qué cambió de raíz:
 * · **Es de noche y hay luz.** Dos halos de color (verde y azul) que
 *   respiran lento. Antes el fondo era un degradado plano.
 * · **Hay movimiento real, no adorno**: una luz recorre la carretera
 *   de Guatire a Caracas en bucle. Es la app en una imagen — alguien
 *   ya va para allá.
 * · **Hay ciudad**: la silueta de los edificios de Caracas al pie de
 *   la montaña, con ventanas encendidas.
 * · **Y hay cuadrícula**, en perspectiva, que le da suelo a todo.
 *
 * Todo es SVG y CSS: cero imágenes, cero librerías, cero peticiones.
 * Con `prefers-reduced-motion` se queda quieto (ver globals.css).
 */
export default function Backdrop() {
  return (
    <div className="auth-sky" aria-hidden="true">
      {/* Halos de color: el ambiente. Van en div y no en SVG porque un
          degradado radial con desenfoque es más barato en CSS. */}
      <span className="sky-glow sky-glow-a" />
      <span className="sky-glow sky-glow-b" />

      <svg
        className="sky-art"
        viewBox="0 0 420 700"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="sk-ridge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B5E3A" stopOpacity="0.55" />
            <stop offset="1" stopColor="#0F1419" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="sk-ridge2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2A7F4F" stopOpacity="0.4" />
            <stop offset="1" stopColor="#0F1419" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="sk-road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22C55E" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#22C55E" stopOpacity="0.55" />
            <stop offset="1" stopColor="#6BA8F5" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="sk-head">
            <stop offset="0" stopColor="#EAFBF0" />
            <stop offset="0.35" stopColor="#22C55E" />
            <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
          </radialGradient>

          {/* La carretera se declara una vez y se reutiliza: la línea,
              el trazo animado y el recorrido de la luz son la MISMA
              curva, así nada queda desalineado. */}
          <path
            id="sk-path"
            d="M-30 600 C 70 596, 96 520, 176 508 C 262 495, 286 402, 392 388"
          />
        </defs>

        {/* Cuadrícula en perspectiva: da suelo. */}
        <g className="sky-grid" stroke="#22C55E" strokeOpacity="0.08">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={`h${i}`} x1="-20" x2="440" y1={470 + i * 34} y2={470 + i * 34} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <line
              key={`v${i}`}
              x1={210 + (i - 4) * 26}
              y1="470"
              x2={210 + (i - 4) * 96}
              y2="700"
            />
          ))}
        </g>

        {/* Dos cadenas de montañas: la de atrás más clara da profundidad. */}
        <path
          d="M-20 300 L48 246 L104 282 L168 214 L236 268 L300 222 L366 272 L440 232 L440 700 L-20 700 Z"
          fill="url(#sk-ridge2)"
        />
        <path
          d="M-20 356 L36 318 L96 350 L150 296 L212 344 L272 302 L338 348 L400 314 L440 342 L440 700 L-20 700 Z"
          fill="url(#sk-ridge)"
        />
        <path
          d="M-20 356 L36 318 L96 350 L150 296 L212 344 L272 302 L338 348 L400 314 L440 342"
          fill="none"
          stroke="#22C55E"
          strokeOpacity="0.34"
          strokeWidth="1.4"
        />

        {/* Caracas al pie de la montaña, con ventanas encendidas. */}
        <g className="sky-city">
          {[
            [24, 402, 16, 44], [46, 386, 13, 60], [64, 410, 18, 36],
            [88, 374, 15, 72], [108, 396, 12, 50], [126, 408, 20, 38],
            [152, 380, 14, 66], [172, 400, 17, 46], [196, 388, 12, 58],
            [214, 406, 19, 40], [240, 378, 15, 68], [260, 398, 13, 48],
            [280, 410, 18, 36], [304, 384, 14, 62], [324, 402, 16, 44],
            [348, 392, 12, 54], [366, 408, 20, 38], [392, 386, 15, 60],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} fill="#0B1016" fillOpacity="0.92" />
              <rect
                className="sky-win"
                style={{ animationDelay: `${(i % 7) * 0.9}s` }}
                x={x + 3}
                y={y + 5}
                width="3"
                height="3"
                fill="#F5D77A"
                fillOpacity="0.75"
              />
              <rect
                className="sky-win"
                style={{ animationDelay: `${(i % 5) * 1.3 + 0.4}s` }}
                x={x + w - 6}
                y={y + 12}
                width="3"
                height="3"
                fill="#8FE7AE"
                fillOpacity="0.6"
              />
            </g>
          ))}
        </g>

        {/* La carretera. */}
        <use href="#sk-path" fill="none" stroke="url(#sk-road)" strokeWidth="3" strokeLinecap="round" />
        <use
          href="#sk-path"
          className="sky-dash"
          fill="none"
          stroke="#22C55E"
          strokeOpacity="0.5"
          strokeWidth="1.6"
          strokeDasharray="10 14"
          strokeLinecap="round"
        />

        {/* Las tres paradas del corredor. */}
        {[[-30, 600], [176, 508], [392, 388]].map(([cx, cy], i) => (
          <circle
            key={i}
            className="sky-stop"
            style={{ animationDelay: `${i * 1.1}s` }}
            cx={cx}
            cy={cy}
            r="4.5"
            fill="#22C55E"
            fillOpacity="0.65"
          />
        ))}

        {/* El carro que ya va para allá: una luz recorriendo la vía. */}
        <circle className="sky-car" r="13" fill="url(#sk-head)">
          <animateMotion dur="7s" repeatCount="indefinite" calcMode="linear">
            <mpath href="#sk-path" />
          </animateMotion>
        </circle>
      </svg>

      {/* Velo de abajo hacia arriba: garantiza contraste del texto sea
          cual sea lo que quede detrás en ese momento. */}
      <span className="sky-veil" />
    </div>
  );
}
