import type { Trip } from '../lib/data';

export default function TripList({
  trips,
  origin,
  destination,
  km,
}: {
  trips: Trip[];
  origin: string;
  destination: string;
  km: number;
}) {
  if (trips.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon">🔍</span>
        No hay viajes de {origin} a {destination} para esa fecha.
        <br />
        Probá con otra ruta de las sugeridas arriba.
      </div>
    );
  }

  const cheapest = Math.min(...trips.map((t) => t.price_usd));

  return (
    <>
      <h2>
        {trips.length} {trips.length === 1 ? 'viaje disponible' : 'viajes disponibles'}
        <span className="h2-note"> · {km} km de recorrido</span>
      </h2>

      {trips.map((trip) => (
        <a key={trip.id} className="trip-card" href={`/viaje/${trip.id}`}>
          <div className="trip-top">
            <div>
              <div className="trip-time">{trip.departure_time}</div>
              <div className="trip-route">
                {trip.origin} → {trip.destination}
              </div>
            </div>
            <div className="trip-price">
              ${trip.price_usd.toFixed(2)}
              <small>por puesto</small>
            </div>
          </div>

          <div className="driver-row">
            <div className="avatar">{trip.driver.photo}</div>
            <div>
              <div className="driver-name">
                {trip.driver.name}
                {trip.price_usd === cheapest && trips.length > 1 && (
                  <span className="tag-best">más barato</span>
                )}
              </div>
              <div className="driver-meta">
                ⭐ {trip.driver.rating.toFixed(1)} · {trip.vehicle.model} · {trip.vehicle.plate}
              </div>
            </div>
            <span className="seats-tag">
              {trip.seats_available}{' '}
              {trip.seats_available === 1 ? 'puesto' : 'puestos'}
            </span>
          </div>
        </a>
      ))}
    </>
  );
}
