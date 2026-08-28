import type { Trip } from '../lib/data';
import { freeSeats, ratingFor } from '../lib/store';
import Avatar from './Avatar';
import Stars from './Stars';

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function TripList({
  trips,
  origin,
  destination,
  date,
  sort,
  km,
  minutes,
  otherDates,
}: {
  trips: Trip[];
  origin: string;
  destination: string;
  date: string;
  sort: string;
  km: number;
  minutes: number;
  otherDates: string[];
}) {
  // ─── Sin resultados ────────────────────────────────
  if (trips.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon">🔍</span>
        <strong>
          No hay viajes de {origin} a {destination} para esa fecha
        </strong>
        Esta ruta todavía no tiene conductores publicando ese día. Puedes probar
        otra fecha o alguna de las rutas sugeridas arriba.
        {otherDates.length > 0 && (
          <div className="chips-row" style={{ justifyContent: 'center', marginTop: 14 }}>
            {otherDates.map((d) => (
              <a
                key={d}
                className="chip"
                href={`/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
                  destination,
                )}&date=${d}&sort=${sort}`}
              >
                Ver el {d}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  const available = trips.filter((t) => freeSeats(t.id) > 0);
  const cheapest = available.length
    ? Math.min(...available.map((t) => t.price_usd))
    : 0;

  return (
    <>
      <div className="results-head">
        <h2>
          {trips.length} {trips.length === 1 ? 'viaje' : 'viajes'}
          {available.length < trips.length && (
            <span className="h2-note">
              {' '}
              · {trips.length - available.length} sin puestos
            </span>
          )}
        </h2>
        <span className="results-meta">
          {km} km · {fmtDuration(minutes)} aprox.
        </span>
      </div>

      {trips.map((trip) => {
        const free = freeSeats(trip.id);
        const soldOut = free === 0;
        const rating = ratingFor(trip.driver.name, trip.driver.rating);
        const isCheapest =
          !soldOut && trip.price_usd === cheapest && available.length > 1;

        const card = (
          <>
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
              <Avatar name={trip.driver.name} />
              <div>
                <div className="driver-name">
                  {trip.driver.name}
                  {isCheapest && <span className="tag-best">más barato</span>}
                </div>
                <div className="driver-meta">
                  <Stars value={rating.value} showValue count={rating.count} />
                  <span className="sep">·</span>
                  {trip.vehicle.model} · {trip.vehicle.plate}
                </div>
              </div>
              {soldOut ? (
                <span className="seats-tag sold-out">Sin puestos</span>
              ) : (
                <span className={`seats-tag ${free === 1 ? 'seats-last' : ''}`}>
                  {free === 1 ? 'último puesto' : `${free} puestos`}
                </span>
              )}
            </div>
          </>
        );

        if (soldOut) {
          return (
            <div className="trip-card is-disabled" key={trip.id}>
              {card}
              <p className="note">
                Este viaje se llenó. Prueba con otro horario de la lista.
              </p>
            </div>
          );
        }

        return (
          <a key={trip.id} className="trip-card" href={`/viaje/${trip.id}`}>
            {card}
          </a>
        );
      })}
    </>
  );
}
