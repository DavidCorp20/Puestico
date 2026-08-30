import { findTrip, freeSeats, ratingFor, reviewsFor } from '../../../lib/store';
import { currentUser } from '../../../lib/session';
import { buildRoute, routeDistanceKm, routeDuration } from '../../../lib/route';
import RouteMap from '../../RouteMap';
import Avatar from '../../Avatar';
import Stars from '../../Stars';
import FareDetail from '../../FareDetail';
import TopBar from '../../TopBar';

export default async function TripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Saber quién mira cambia la hoja de reserva: con sesión reserva
  // directo, sin sesión el botón lleva a entrar. Nada de elegir
  // pasajero de una lista.
  const user = await currentUser();
  const trip = findTrip(id);

  if (!trip) {
    return (
      <>
        <TopBar title="Viaje" back="/" />
        <main className="screen">
          <div className="empty">
            <span className="empty-icon">🤔</span>
            <strong>No encontramos ese viaje</strong>
            Puede que el conductor lo haya dado de baja.
            <a className="btn" href="/" style={{ marginTop: 14 }}>
              Volver a buscar
            </a>
          </div>
        </main>
      </>
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
        <TopBar title="Viaje lleno" back="/" />
        <main className="screen">
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
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={`${trip.origin} → ${trip.destination}`} back="/" />
      <main className="screen has-sheet" id="contenido">
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

      <FareDetail
        origin={trip.origin}
        destination={trip.destination}
        price={trip.price_usd}
        time={trip.departure_time}
      />

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

      {/* Hoja de reserva anclada abajo, como en Uber/Yummy: la acción
          principal siempre al alcance del pulgar */}
      <form className="book-sheet" action={`/reserva/${trip.id}`} method="get">
        <div className="bs-grid single">
          <div className="bs-field">
            <label htmlFor="seats">¿Cuántos puestos?</label>
            <select id="seats" name="seats" defaultValue="1">
              {Array.from({ length: free }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'puesto' : 'puestos'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bs-action">
          <div className="bs-price">
            <strong>${trip.price_usd.toFixed(2)}</strong>
            <small>por puesto</small>
          </div>
          {user && user.name ? (
            <button className="btn" type="submit">
              Reservar mi puesto
            </button>
          ) : (
            <a className="btn" href={`/entrar?next=/viaje/${trip.id}`}>
              Entrar y reservar
            </a>
          )}
        </div>
      </form>
      </main>
    </>
  );
}
