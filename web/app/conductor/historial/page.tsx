import {
  bookingsForDriver,
  allTrips,
  reviewsFor,
  ratingFor,
} from '../../../lib/store';
import { driverIdFor } from '../../../lib/auth';
import { requireDriver } from '../../../lib/guard';
import { TEST_DRIVERS } from '../../../lib/data';
import Avatar from '../../Avatar';
import Stars from '../../Stars';
import TopBar from '../../TopBar';
import BottomNav from '../../BottomNav';

/**
 * Historial y reputación del conductor.
 *
 * Salió del panel principal porque es información de consulta, no de
 * acción: se mira una vez a la semana, no cada vez que se abre la app.
 */
export default async function Historial() {
  const user = await requireDriver('/conductor/historial');
  const driverId = driverIdFor(user) || user.id;
  const driver = TEST_DRIVERS.find((d) => d.id === driverId) || TEST_DRIVERS[0];

  const completed = bookingsForDriver(driverId).filter(
    (b) => b.status === 'completed',
  );
  const trips = allTrips();
  const received = reviewsFor(driver.name).slice().reverse();

  const total = completed.reduce((s, b) => s + b.driver_amount_usd, 0);
  const comision = completed.reduce((s, b) => s + b.commission_usd, 0);
  const rating = ratingFor(driver.name, 5);

  return (
    <>
      <TopBar title="Historial" back="/conductor" />
      <main className="screen" id="contenido">
        <div className="stats">
          <div className="stat">
            <strong>{completed.length}</strong>
            <small>viajes completados</small>
          </div>
          <div className="stat">
            <strong>${total.toFixed(2)}</strong>
            <small>ganado en total</small>
          </div>
          <div className="stat">
            <strong>{rating.value.toFixed(1)}</strong>
            <small>{rating.count} calificaciones</small>
          </div>
        </div>

        {completed.length > 0 && (
          <div className="card">
            <h2>Cuentas</h2>
            <div className="row">
              <span>Cobrado a pasajeros</span>
              <span>${(total + comision).toFixed(2)}</span>
            </div>
            <div className="row">
              <span>Comisión Puestico (15%)</span>
              <span>−${comision.toFixed(2)}</span>
            </div>
            <div className="row row-total">
              <span>Te quedó</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <h2 className="section-h">Viajes completados</h2>
        {completed.length === 0 && (
          <div className="empty">
            <span className="empty-icon">🗂️</span>
            <strong>Todavía no completaste ningún viaje</strong>
            Cuando cierres tu primer viaje aparece acá con su liquidación.
          </div>
        )}
        {completed.map((b) => {
          const trip = trips.find((t) => t.id === b.trip_id);
          if (!trip) return null;
          return (
            <div className="card" key={b.id}>
              <div className="trip-top">
                <div>
                  <div className="trip-time">{trip.departure_time}</div>
                  <div className="trip-route">
                    {trip.origin} → {trip.destination} · {trip.departure_date}
                  </div>
                </div>
                <span className="seats-tag accent">
                  ${b.driver_amount_usd.toFixed(2)}
                </span>
              </div>
              <div className="driver-row">
                <Avatar name={b.passenger_name} size={34} />
                <div className="driver-meta">
                  {b.passenger_name} · {b.seats}{' '}
                  {b.seats === 1 ? 'puesto' : 'puestos'}
                </div>
              </div>
            </div>
          );
        })}

        {received.length > 0 && (
          <>
            <h2 className="section-h">Lo que dicen de ti</h2>
            {received.map((r) => (
              <div className="card review" key={r.id}>
                <div className="review-head">
                  <Avatar name={r.author_name} size={32} />
                  <div>
                    <div className="driver-name">{r.author_name}</div>
                    <Stars value={r.stars} size={13} />
                  </div>
                </div>
                {r.comment && <p className="review-comment">“{r.comment}”</p>}
              </div>
            ))}
          </>
        )}
      </main>
      <BottomNav current="viajes" user={user} />
    </>
  );
}
