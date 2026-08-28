import { TEST_USERS } from '../../lib/data';
import { bookingsForPassenger, findTrip, tripStatus } from '../../lib/store';

const LABEL: Record<string, string> = {
  pending: 'Esperando al conductor',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export default async function MisViajes({
  searchParams,
}: {
  searchParams: Promise<{ passenger?: string }>;
}) {
  const sp = await searchParams;
  const passengerId = sp.passenger || TEST_USERS[0].id;
  const passenger = TEST_USERS.find((u) => u.id === passengerId) || TEST_USERS[0];
  const bookings = bookingsForPassenger(passenger.id).reverse();

  return (
    <>
      <div className="mode-switch">
        <a href="/" className="mode-tab">Buscar</a>
        <span className="mode-tab active">Mis viajes</span>
        <a href="/conductor" className="mode-tab">Soy conductor</a>
      </div>

      <h1>Mis viajes</h1>
      <p className="subtitle">Tus reservas y su estado.</p>

      <form className="card" method="get" style={{ paddingBottom: 14 }}>
        <div className="field">
          <label htmlFor="p">Viendo como</label>
          <select id="p" name="passenger" defaultValue={passenger.id}>
            {TEST_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost" type="submit" style={{ marginTop: 10 }}>
          Cambiar
        </button>
      </form>

      {bookings.length === 0 && (
        <div className="empty">
          <span className="empty-icon">🎫</span>
          Todavía no reservaste ningún viaje.
          <br />
          <a className="back-link" href="/">← Buscar un viaje</a>
        </div>
      )}

      {bookings.map((b) => {
        const trip = findTrip(b.trip_id);
        if (!trip) return null;
        const status = tripStatus(trip.id);
        return (
          <div className="card" key={b.id}>
            <div className="trip-top">
              <div>
                <div className="trip-time">{trip.departure_time}</div>
                <div className="trip-route">
                  {trip.origin} → {trip.destination} · {trip.departure_date}
                </div>
              </div>
              <span className={`status-pill status-${b.status}`}>
                {LABEL[b.status]}
              </span>
            </div>

            <div className="driver-row">
              <div className="avatar">{trip.driver.photo}</div>
              <div>
                <div className="driver-name">{trip.driver.name}</div>
                <div className="driver-meta">
                  {trip.vehicle.model} · {trip.vehicle.plate}
                </div>
              </div>
              <span className="seats-tag">${b.total_usd.toFixed(2)}</span>
            </div>

            {b.status === 'confirmed' && status === 'active' && (
              <a className="btn" href={`/seguimiento/${trip.id}`} style={{ marginTop: 12 }}>
                Ver el viaje en vivo
              </a>
            )}
            {b.status === 'confirmed' && status === 'scheduled' && (
              <p className="note">
                Tu puesto está confirmado. Te avisamos cuando el conductor arranque.
              </p>
            )}
            {b.status === 'pending' && (
              <p className="note">
                {trip.driver.name.split(' ')[0]} todavía no respondió tu solicitud.
              </p>
            )}
            {b.status === 'rejected' && (
              <p className="note">
                El conductor no pudo tomarte esta vez. No se te cobró nada.
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
