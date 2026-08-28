import { TEST_USERS } from '../../../lib/data';
import { findTrip, freeSeats, ratingFor, reviewsFor } from '../../../lib/store';
import { buildRoute, routeDistanceKm, routeDuration } from '../../../lib/route';
import RouteMap from '../../RouteMap';
import Avatar from '../../Avatar';
import Stars from '../../Stars';

export default async function TripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = findTrip(id);

  if (!trip) {
    return (
      <div className="empty">
        <span className="empty-icon">🤔</span>
        <strong>No encontramos ese viaje</strong>
        Puede que el conductor lo haya dado de baja.
        <a className="btn" href="/" style={{ marginTop: 14 }}>
          Volver a buscar
        </a>
      </div>
    );
  }

  const free = freeSeats(trip.id);
  const rating = ratingFor(trip.driver.name, trip.driver.rating);
  const reviews = reviewsFor(trip.driver.name).slice(-2).reverse();
  const route = buildRoute(trip.origin, trip.destination);
  const km = routeDistanceKm(route);
  const minutes = routeDuration(route);

  // ─── Viaje lleno ───────────────────────────────────
  if (free === 0) {
    return (
      <>
        <a className="back-link" href="/">← Volver a los resultados</a>
        <div className="alert alert-warn">
          <strong>Este viaje se llenó</strong>
          Alguien tomó el último puesto mientras lo mirabas. Te mostramos los
          datos igual, pero ya no se puede reservar.
        </div>

        <h1>{trip.origin} → {trip.destination}</h1>
        <p className="subtitle">
          {trip.departure_date} · sale {trip.departure_time}
        </p>

        <div className="card map-card">
          <RouteMap origin={trip.origin} destination={trip.destination} />
        </div>

        <a className="btn" href="/">Buscar otro viaje</a>
      </>
    );
  }

  return (
    <>
      <a className="back-link" href="/">← Volver a los resultados</a>

      <div className="detail-head">
        <div>
          <h1>{trip.origin} → {trip.destination}</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {trip.departure_date} · sale {trip.departure_time}
          </p>
        </div>
        <div className="trip-price big">
          ${trip.price_usd.toFixed(2)}
          <small>por puesto</small>
        </div>
      </div>

      <div className="facts-row">
        <div className="fact">
          <strong>{km} km</strong>
          <small>recorrido</small>
        </div>
        <div className="fact">
          <strong>{minutes} min</strong>
          <small>estimado</small>
        </div>
        <div className="fact">
          <strong>{free}</strong>
          <small>{free === 1 ? 'puesto libre' : 'puestos libres'}</small>
        </div>
      </div>

      <div className="card map-card">
        <RouteMap origin={trip.origin} destination={trip.destination} />
      </div>

      <div className="card">
        <div className="driver-row flush">
          <Avatar name={trip.driver.name} size={54} />
          <div>
            <div className="driver-name lg">{trip.driver.name}</div>
            <div className="driver-meta">
              <Stars value={rating.value} showValue count={rating.count} />
              <span className="sep">·</span>
              {trip.driver.completed_trips} viajes
            </div>
          </div>
          <span className="verified-tag">🛡️ Verificado</span>
        </div>

        {reviews.map((r) => (
          <div className="review-inline" key={r.id}>
            <Stars value={r.stars} size={12} />
            <span>
              “{r.comment || 'Sin comentario'}” — {r.author_name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>El vehículo</h2>
        <div className="row">
          <span>Modelo</span>
          <span>{trip.vehicle.model} {trip.vehicle.year}</span>
        </div>
        <div className="row">
          <span>Color</span>
          <span>{trip.vehicle.color}</span>
        </div>
        <div className="row">
          <span>Placa</span>
          <span><strong>{trip.vehicle.plate}</strong></span>
        </div>
        <div className="row">
          <span>Puestos libres</span>
          <span>{free} de {trip.seats_total}</span>
        </div>
      </div>

      <form className="card" action={`/reserva/${trip.id}`} method="get">
        <h2>Reservar tu puesto</h2>

        <div className="field mb">
          <label htmlFor="passenger">Viajas como</label>
          <select id="passenger" name="passenger" defaultValue={TEST_USERS[0].id}>
            {TEST_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="field mb">
          <label htmlFor="seats">Cuántos puestos</label>
          <select id="seats" name="seats" defaultValue="1">
            {Array.from({ length: free }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="row row-total">
          <span>Precio por puesto</span>
          <span>${trip.price_usd.toFixed(2)}</span>
        </div>

        <button className="btn" type="submit">
          Continuar al pago
        </button>

        <p className="note">
          Modo demo: no se cobra nada real. El pago es simulado.
        </p>
      </form>
    </>
  );
}
