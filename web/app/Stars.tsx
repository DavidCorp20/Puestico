/**
 * Estrellas de calificación con soporte de media estrella.
 *
 * Se dibuja en SVG con un degradado por instancia: el relleno parcial
 * permite mostrar 4,5 como cuatro estrellas y media, no cuatro redondeadas.
 */
const PATH =
  'M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z';

export default function Stars({
  value,
  size = 14,
  showValue = false,
  count,
}: {
  value: number;
  size?: number;
  showValue?: boolean;
  /** Cantidad de opiniones, si se quiere mostrar entre paréntesis. */
  count?: number;
}) {
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <span className="stars" title={`${clamped.toFixed(1)} de 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        // Fracción de esta estrella que va rellena (0, 0.5 … 1)
        const fill = Math.max(0, Math.min(1, clamped - i));
        const id = `st-${size}-${i}-${Math.round(clamped * 10)}`;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={fill} stopColor="var(--star)" />
                <stop offset={fill} stopColor="var(--star-off)" />
              </linearGradient>
            </defs>
            <path d={PATH} fill={`url(#${id})`} />
          </svg>
        );
      })}
      {showValue && (
        <span className="stars-value">
          {clamped.toFixed(1)}
          {count !== undefined && count > 0 && (
            <span className="stars-count"> ({count})</span>
          )}
        </span>
      )}
    </span>
  );
}
