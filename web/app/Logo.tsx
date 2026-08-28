/**
 * Logo de Puestico.
 *
 * La marca es un asiento visto de frente con una chispa de movimiento:
 * "puesto" (el asiento libre) + el viaje. Dibujado en SVG para que escale
 * sin perder nitidez y no dependa de archivos de imagen.
 */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="logo-svg"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>

      {/* Contenedor redondeado */}
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="url(#lg)" />

      {/* Respaldo del asiento */}
      <path
        d="M13.5 10.5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v9.5c0 1.1-.9 2-2 2h-6c-1.1 0-2-.9-2-2v-9.5z"
        fill="#fff"
        fillOpacity="0.95"
      />
      {/* Base del asiento */}
      <path
        d="M11 24.5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v1.5c0 1.1-.9 2-2 2H13c-1.1 0-2-.9-2-2v-1.5z"
        fill="#fff"
        fillOpacity="0.95"
      />
      {/* Chispa de movimiento */}
      <path
        d="M28.5 14.5l2.6-1.1-1.1 2.6 1.1 2.6-2.6-1.1-2.6 1.1 1.1-2.6-1.1-2.6 2.6 1.1z"
        fill="#fff"
        fillOpacity="0.75"
      />
    </svg>
  );
}
