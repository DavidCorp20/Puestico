/**
 * Iconos de la interfaz — trazo, 24×24, heredan el color.
 *
 * Dibujados a mano en vez de traer una librería de iconos: son ocho,
 * pesan nada y así la barra inferior no depende de un paquete externo.
 * `stroke="currentColor"` los hace tomar el color del estado activo.
 */
type P = { size?: number; filled?: boolean };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

/** Lupa — buscar viajes. */
export function IconSearch({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  );
}

/** Ticket — mis viajes. */
export function IconTicket({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M3 9.5V7a1 1 0 011-1h16a1 1 0 011 1v2.5a2.5 2.5 0 000 5V17a1 1 0 01-1 1H4a1 1 0 01-1-1v-2.5a2.5 2.5 0 000-5z" />
      <path d="M12 6v12" strokeDasharray="2 2.5" />
    </svg>
  );
}

/** Volante — modo conductor. */
export function IconWheel({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v6M4.2 15.4l5.3-2.2M19.8 15.4l-5.3-2.2" />
    </svg>
  );
}

/** Gráfico — métricas del negocio. */
export function IconChart({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M4 20h16" />
      <path d="M6.5 20v-6M11.5 20V8M16.5 20v-9" />
    </svg>
  );
}

/** Marcador de mapa. */
export function IconPin({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 105.5 10.8C5.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}

/** Reloj. */
export function IconClock({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

/** Flecha atrás. */
export function IconBack({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Intercambiar origen y destino. */
export function IconSwap({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M7 4v14M7 18l-3-3M7 18l3-3" />
      <path d="M17 20V6M17 6l-3 3M17 6l3 3" />
    </svg>
  );
}

/** Escudo — conductor verificado. */
export function IconShield({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l7 3v5.5c0 4.3-3 8.2-7 9.5-4-1.3-7-5.2-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Persona — perfil. */
export function IconUser({ size = 24 }: P) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8" />
    </svg>
  );
}
