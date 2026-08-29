import type { Trip } from '../lib/data';
import { freeSeats, ratingFor } from '../lib/store';
import Avatar from './Avatar';
import Stars from './Stars';
import FareBadge from './FareBadge';

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
        <strong>Todavía nadie va para allá</strong>
        Prueba con otra hora o cambia el punto de encuentro. Estas fechas sí
        tienen carros saliendo:
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
        <h2 className="sec-title" style={{ marginBottom: 0 }}>
          {trips.length} {trips.length === 1 ? 'carro va' : 'carros van'} para allá
        </h2>
        <span className="results-meta">
          {km} km · {fmtDuration(minutes)}
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
            {/* Fila 1: conductor + hora de salida */}
            <div className="rc-head">
              <Avatar name={trip.driver.name} size={42} />
              <div className="rc-who">
                <div className="rc-name">
                  {trip.driver.name}
                  {isCheapest && <span className="tag-best">más barato</span>}
                </div>
                <div className="rc-rating">
                  <Stars value={rating.value} showValue count={rating.count} />
                </div>
              </div>
              <div className="rc-time">
                <strong>{trip.departure_time}</strong>
                <small>sale</small>
              </div>
            </div>

            {/* Fila 2: el trayecto, como un trayecto */}
            <div className="rc-route">
              <span className="rc-rail" aria-hidden="true">
                <span className="rail-dot origin" />
                <span className="rail-line short" />
                <span className="rail-dot dest" />
              </span>
              <span className="rc-places">
                <span>{trip.origin}</span>
                <span>{trip.destination}</span>
              </span>
            </div>

            {/* Fila 3: carro, puestos y precio */}
            <div className="rc-foot">
              <span className="rc-car">
                {trip.vehicle.model} · {trip.vehicle.plate}
              </span>
              {soldOut ? (
                <span className="seats-tag sold-out">Sin puestos</span>
              ) : (
                <span className={`seats-tag ${free === 1 ? 'seats-last' : ''}`}>
                  {free === 1 ? 'último puesto' : `${free} puestos`}
                </span>
              )}
              <span className="rc-price">
                ${trip.price_usd.toFixed(2)}
                <small>/puesto</small>
              </span>
            </div>

            <FareBadge
              origin={trip.origin}
              destination={trip.destination}
              price={trip.price_usd}
              time={trip.departure_time}
              showSavings
            />
          </>
        );

        if (soldOut) {
          return (
            <div className="ride-card is-disabled" key={trip.id}>
              {card}
              <p className="note">
                Este viaje se llenó. Prueba con otro horario de la lista.
              </p>
            </div>
          );
        }

        return (
          <a key={trip.id} className="ride-card" href={`/viaje/${trip.id}`}>
            {card}
          </a>
        );
      })}
    </>
  );
}
