/**
 * Marca de Puestico — diseño de Designer.
 *
 * Cuatro puestos vistos desde arriba: tres ocupados y uno libre en
 * contorno. Ese puesto vacío es lo que la persona viene a buscar.
 *
 * Se dibuja inline (no como <img>) para que herede el color y no
 * dispare una petición extra. El id del degradado es único por
 * instancia para que no choquen dos logos en la misma página.
 */
export default function Logo({ size = 32 }: { size?: number }) {
  const gid = `pg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="logo-svg"
      role="img"
      aria-label="Puestico"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#0F9E4A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${gid})`} />
      <g fill="#0F1419">
        <rect x="15" y="15" width="15" height="15" rx="5" />
        <rect x="34" y="15" width="15" height="15" rx="5" />
        <rect x="15" y="34" width="15" height="15" rx="5" />
      </g>
      <rect
        x="36.7"
        y="36.7"
        width="15"
        height="15"
        rx="5"
        fill="none"
        stroke="#0F1419"
        strokeWidth="3.6"
      />
    </svg>
  );
}
