import { TEST_DRIVERS } from '../../lib/data';
import { allTrips, bookingsForDriver, tripStatus } from '../../lib/store';
import DriverActions from './DriverActions';
import Avatar from '../Avatar';

export default async function DriverHome({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const sp = await searchParams;
  const driverId = sp.driver || TEST_DRIVERS[0].id;
  const driver = TEST_DRIVERS.find((d) => d.id === driverId) || TEST_DRIVERS[0];

  const myTrips = allTrips().filter((t) => t.driver.id === driver.id);
  const myBookings = bookingsForDriver(driver.id);
  const pending = myBookings.filter((b) => b.status === 'pending');
  const confirmed = myBookings.filter((b) => b.status === 'confirmed');
  const completed = myBookings.filter((b) => b.status === 'completed');

  const earned = completed.reduce((s, b) => s + b.driver_amount_usd, 0);

  return (
    <>
      <div className="mode-switch">
        <a href="/" className="mode-tab">Soy pasajero</a>
        <span className="mode-tab active">Soy conductor</span>
      </div>

      <h1>Hola, {driver.name.split(' ')[0]}</h1>
      <p className="subtitle">Gestioná tus viajes y las solicitudes de pasajeros.</p>

      <form className="card" method="get" style={{ paddingBottom: 14 }}>
        <div className="field">
          <label htmlFor="driver">Estás usando la cuenta de</label>
          <select id="driver" name="driver" defaultValue={driver.id}>
            {TEST_DRIVERS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost" type="submit" style={{ marginTop: 10 }}>
          Cambiar
        </button>
      </form>

      <div className="stats">
        <div className="stat">
          <strong>{myTrips.length}</strong>
          <small>viajes publicados</small>
        </div>
        <div className="stat">
          <strong>{pending.length}</strong>
          <small>por responder</small>
        </div>
        <div className="stat">
          <strong>${earned.toFixed(2)}</strong>
          <small>ganado</small>
        </div>
      </div>

      <a className="btn" href={`/conductor/publicar?driver=${driver.id}`}>
        + Publicar un viaje
      </a>

      {pending.length > 0 && (
        <>
          <h2 style={{ marginTop: 26 }}>
            Solicitudes por responder ({pending.length})
          </h2>
          {pending.map((b) => {
            const trip = myTrips.find((t) => t.id === b.trip_id);
            return (
              <div className="card" key={b.id}>
                <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <Avatar name={b.passenger_name} />
                  <div>
                    <div className="driver-name">{b.passenger_name}</div>
                    <div className="driver-meta">
                      ⭐ {b.passenger_rating.toFixed(1)} · pide {b.seats}{' '}
                      {b.seats === 1 ? 'puesto' : 'puestos'}
                    </div>
                  </div>
                  <span className="seats-tag">${b.driver_amount_usd.toFixed(2)}</span>
                </div>
                {trip && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <span>Viaje</span>
                    <span>
                      {trip.origin} → {trip.destination} · {trip.departure_time}
                    </span>
                  </div>
                )}
                <DriverActions bookingId={b.id} driverId={driver.id} />
              </div>
            );
          })}
        </>
      )}

      <h2 style={{ marginTop: 26 }}>Mis viajes</h2>
      {myTrips.length === 0 && (
        <div className="empty">
          <span className="empty-icon">🚗</span>
          Todavía no publicaste ningún viaje.
        </div>
      )}
      {myTrips.map((t) => {
        const status = tripStatus(t.id);
        const tripConfirmed = confirmed.filter((b) => b.trip_id === t.id);
        return (
          <a className="trip-card" key={t.id} href={`/conductor/viaje/${t.id}?driver=${driver.id}`}>
            <div className="trip-top">
              <div>
                <div className="trip-time">{t.departure_time}</div>
                <div className="trip-route">
                  {t.origin} → {t.destination} · {t.departure_date}
                </div>
              </div>
              <span className={`status-pill status-${status}`}>
                {status === 'scheduled' && 'Programado'}
                {status === 'active' && 'En curso'}
                {status === 'completed' && 'Finalizado'}
              </span>
            </div>
            <div className="driver-row">
              <div className="driver-meta">
                {tripConfirmed.length} pasajero(s) confirmado(s) ·{' '}
                {t.seats_available} puesto(s) libre(s)
              </div>
              <span className="seats-tag">${t.price_usd.toFixed(2)}</span>
            </div>
          </a>
        );
      })}
    </>
  );
}
