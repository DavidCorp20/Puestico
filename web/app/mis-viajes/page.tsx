import { TEST_USERS } from '../../lib/data';
import {
  bookingsForPassenger,
  findTrip,
  tripStatus,
  reviewForBooking,
  ratingFor,
  refundFor,
  departureDate,
} from '../../lib/store';
import Avatar from '../Avatar';
import Stars from '../Stars';
import Tabs from '../Tabs';
import RatingForm from '../RatingForm';
import CancelButton from './CancelButton';

const LABEL: Record<string, string> = {
  pending: 'Esperando al conductor',
  confirmed: 'Confirmado',
  rejected: 'No aceptado',
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

  const activos = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed',
  );
  const historicos = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected',
  );

  const gastado = bookings
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + b.total_usd, 0);

  return (
    <>
      <Tabs current="mis-viajes" passenger={passenger.id} />

      <h1>Mis viajes</h1>
      <p className="subtitle">Tus reservas y en qué va cada una.</p>

      <form className="card compact" method="get">
        <div className="field">
          <label htmlFor="p">Viendo como</label>
          <select id="p" name="passenger" defaultValue={passenger.id}>
            {TEST_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" type="submit">
          Cambiar
        </button>
      </form>

      {bookings.length > 0 && (
        <div className="stats">
          <div className="stat">
            <strong>{activos.length}</strong>
            <small>viajes activos</small>
          </div>
          <div className="stat">
            <strong>{historicos.filter((b) => b.status === 'completed').length}</strong>
            <small>completados</small>
          </div>
          <div className="stat">
            <strong>${gastado.toFixed(2)}</strong>
            <small>gastado</small>
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="empty">
          <span className="empty-icon">🎫</span>
          <strong>Aquí van a aparecer tus viajes</strong>
          Reserva el primero y lo sigues desde acá.
          <a className="btn" href="/" style={{ marginTop: 14 }}>
            Buscar un viaje
          </a>
        </div>
      )}

      {activos.length > 0 && <h2 className="section-h">Próximos viajes</h2>}
      {activos.map((b) => {
        const trip = findTrip(b.trip_id);
        if (!trip) return null;
        const status = tripStatus(trip.id);
        const rating = ratingFor(trip.driver.name, trip.driver.rating);
        const { refund, full, hoursLeft } = refundFor(b, departureDate(trip.id));

        return (
          <div className="card fade-in" key={b.id}>
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
              <Avatar name={trip.driver.name} />
              <div>
                <div className="driver-name">{trip.driver.name}</div>
                <div className="driver-meta">
                  <Stars value={rating.value} showValue count={rating.count} />
                  <span className="sep">·</span>
                  {trip.vehicle.model} · {trip.vehicle.plate}
                </div>
              </div>
              <span className="seats-tag">${b.total_usd.toFixed(2)}</span>
            </div>

            {b.status === 'confirmed' && status === 'active' && (
              <a className="btn" href={`/seguimiento/${trip.id}`}>
                Ver el viaje en vivo
              </a>
            )}
            {b.status === 'confirmed' && status === 'scheduled' && (
              <>
                <p className="note note-ok">
                  Viaje confirmado. {trip.driver.name.split(' ')[0]} te recoge
                  en {trip.origin} a las {trip.departure_time}.
                </p>
                <a
                  className="btn btn-ghost btn-sm"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hola ${trip.driver.name.split(' ')[0]}, soy ${passenger.name} y reservé un puesto en tu viaje ${trip.origin} → ${trip.destination} de las ${trip.departure_time}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Escribirle por WhatsApp
                </a>
                <CancelButton
                  bookingId={b.id}
                  total={b.total_usd}
                  refund={refund}
                  full={full}
                  hoursLeft={hoursLeft}
                />
              </>
            )}
            {b.status === 'pending' && (
              <>
                <p className="note">
                  {trip.driver.name.split(' ')[0]} todavía no responde tu
                  solicitud. Suele tardar unos minutos.
                </p>
                <CancelButton
                  bookingId={b.id}
                  total={b.total_usd}
                  refund={refund}
                  full={full}
                  hoursLeft={hoursLeft}
                />
              </>
            )}
          </div>
        );
      })}

      {historicos.length > 0 && <h2 className="section-h">Historial</h2>}
      {historicos.map((b) => {
        const trip = findTrip(b.trip_id);
        if (!trip) return null;
        const myReview = reviewForBooking(b.id, 'passenger_to_driver');

        return (
          <div className="card fade-in" key={b.id}>
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
              <Avatar name={trip.driver.name} />
              <div>
                <div className="driver-name">{trip.driver.name}</div>
                <div className="driver-meta">
                  {trip.vehicle.model} · {trip.vehicle.plate}
                </div>
              </div>
              <span className="seats-tag">${b.total_usd.toFixed(2)}</span>
            </div>

            {b.status === 'completed' && myReview && (
              <div className="review-mine">
                <span className="review-mine-label">Tu calificación</span>
                <Stars value={myReview.stars} size={15} />
                {myReview.comment && (
                  <p className="review-comment">“{myReview.comment}”</p>
                )}
              </div>
            )}

            {b.status === 'completed' && !myReview && (
              <RatingForm
                bookingId={b.id}
                direction="passenger_to_driver"
                targetName={trip.driver.name}
              />
            )}

            {b.status === 'rejected' && (
              <p className="note">
                El conductor no pudo llevarte esta vez. No se te cobró nada.
              </p>
            )}
            {b.status === 'cancelled' && (
              <p className="note">Cancelaste este puesto. Queda libre para otro pasajero.</p>
            )}
          </div>
        );
      })}
    </>
  );
}
