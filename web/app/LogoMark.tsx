/**
 * Marca grande para la pantalla de ingreso.
 *
 * Es el MISMO concepto que `app/Logo.tsx` — cuatro puestos vistos desde
 * arriba, tres ocupados y uno libre — pero tratado para que aguante un
 * tamaño grande, que es donde el logo chico se veía plano.
 *
 * Qué le da carácter, y por qué cada cosa:
 *
 * · **El puesto libre es el protagonista.** Está en contorno y, con
 *   `animate`, late suavemente. Es lo que la persona viene a buscar, así
 *   que es lo único que se mueve.
 * · **Profundidad sin degradados chillones**: un halo detrás, sombra
 *   interna arriba y un brillo diagonal. El logo anterior era un
 *   cuadrado verde plano; esto se ve como un objeto.
 * · **Los tres puestos ocupados tienen inclinaciones distintas** (muy
 *   leves). Un patrón perfectamente regular parece un icono de sistema;
 *   la irregularidad mínima lo hace parecer dibujado.
 * · **El tricolor** aparece como tres marcas cortas al pie, no como una
 *   bandera literal: identidad venezolana sin caer en el cliché.
 *
 * Designer va a entregar la versión definitiva del trazo. Cuando llegue
 * se reemplaza esto y `Logo.tsx`, que son los dos únicos archivos que
 * dibujan la marca.
 */
export default function LogoMark({
  size = 78,
  animate = false,
}: {
  size?: number;
  animate?: boolean;
}) {
  // Los ids tienen que ser únicos por tamaño: dos marcas en la misma
  // página con el mismo id de degradado se pisan entre sí.
  const u = `lm${size}`;

  return (
    <span
      className={`logomark ${animate ? 'is-animated' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 96 96"
        width={size}
        height={size}
        role="img"
        aria-label="Puestico"
      >
        <defs>
          <linearGradient id={`${u}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2FE070" />
            <stop offset="0.55" stopColor="#22C55E" />
            <stop offset="1" stopColor="#0B8C41" />
          </linearGradient>

          {/* Brillo diagonal: da la sensación de superficie. */}
          <linearGradient id={`${u}-shine`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`${u}-halo`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.55" stopColor="#22C55E" stopOpacity="0.34" />
            <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Halo: separa la marca del fondo sin necesitar un borde. */}
        <circle cx="48" cy="48" r="47" fill={`url(#${u}-halo)`} />

        {/* Cuerpo con esquinas muy redondeadas, como un icono de app. */}
        <rect
          x="10"
          y="10"
          width="76"
          height="76"
          rx="23"
          fill={`url(#${u}-body)`}
        />
        <rect
          x="10"
          y="10"
          width="76"
          height="76"
          rx="23"
          fill={`url(#${u}-shine)`}
        />

        {/* Tres puestos ocupados. Las inclinaciones mínimas y distintas
            son a propósito: la regularidad perfecta parece plantilla. */}
        <g className="lm-seats">
          <rect
            x="25"
            y="25"
            width="20"
            height="20"
            rx="7"
            fill="#0B2016"
            transform="rotate(-2.5 35 35)"
          />
          <rect
            x="51"
            y="25"
            width="20"
            height="20"
            rx="7"
            fill="#0B2016"
            transform="rotate(1.8 61 35)"
          />
          <rect
            x="25"
            y="51"
            width="20"
            height="20"
            rx="7"
            fill="#0B2016"
            transform="rotate(2.2 35 61)"
          />
        </g>

        {/* El puesto libre: el que la persona viene a buscar. */}
        <g className="lm-free">
          <rect
            x="51"
            y="51"
            width="20"
            height="20"
            rx="7"
            fill="none"
            stroke="#0B2016"
            strokeWidth="3.4"
            strokeDasharray="0.1 0"
          />
          {/* Destello en el centro: marca que está disponible. */}
          <circle className="lm-spark" cx="61" cy="61" r="3.4" fill="#0B2016" />
        </g>

        {/* Tricolor al pie: identidad sin bandera literal. */}
        <g className="lm-flag" opacity="0.9">
          <rect x="36" y="79" width="7.5" height="2.6" rx="1.3" fill="#FFCE3A" />
          <rect x="45" y="79" width="7.5" height="2.6" rx="1.3" fill="#0B49C4" />
          <rect x="54" y="79" width="7.5" height="2.6" rx="1.3" fill="#D9243C" />
        </g>
      </svg>
    </span>
  );
}
