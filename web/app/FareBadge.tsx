import { computeFare, passengerSavings } from '../lib/fare';

/**
 * Muestra si el precio de un viaje está dentro de la tarifa regulada.
 *
 * Le sirve al pasajero para confiar (nadie le está cobrando de más) y
 * al conductor para saber que su precio es competitivo.
 */
export default function FareBadge({
  origin,
  destination,
  price,
  time,
  showSavings = false,
}: {
  origin: string;
  destination: string;
  price: number;
  time?: string;
  showSavings?: boolean;
}) {
  const fare = computeFare(origin, destination, time);
  const savings = passengerSavings(price, fare);

  const belowSuggested = price < fare.suggested;
  const level =
    price <= fare.floor + 0.01
      ? 'best'
      : belowSuggested
        ? 'good'
        : price <= fare.ceiling + 0.01
          ? 'fair'
          : 'high';

  const LABEL: Record<string, string> = {
    best: 'Precio mínimo regulado',
    good: 'Por debajo de la tarifa',
    fair: 'Tarifa justa',
    high: 'Sobre la tarifa',
  };

  return (
    <div className="fare-badge-wrap">
      <span className={`fare-badge fare-${level}`}>
        <span className="fare-dot" />
        {LABEL[level]}
      </span>
      {showSavings && savings.saved > 0 && (
        <span className="fare-savings">
          Ahorras ${savings.saved.toFixed(2)} contra un taxi (
          {savings.percent}%)
        </span>
      )}
    </div>
  );
}
