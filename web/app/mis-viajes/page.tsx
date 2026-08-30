import { identityFor } from '../../lib/auth';
import { requirePassenger } from '../../lib/guard';
import {
  bookingsForPassenger,
  findTrip,
  tripStatus,
  reviewForBooking,
  ratingFor,
  refundFor,
  departureDate,
  unreadCount,
  isPaid,
} from '../../lib/store';
import Avatar from '../Avatar';
import Stars from '../Stars';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import RatingForm from '../RatingForm';
import CancelButton from './CancelButton';

const LABEL: Record<string, string> = {
  pending: 'Esperando al conductor',
  confirmed: 'Confirmado',
  rejected: 'No aceptado',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export default async function MisViajes() {
  // Pantalla de pasajero: la identidad sale de la sesión y un
  // conductor que caiga acá se va a su panel.
  const user = await requirePassenger('/mis-viajes');
  const passenger = user;
  const verified = identityFor(user.id).status === 'approved';
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
      <TopBar />
      <main className="screen" id="contenido">
      <div className="greet">
        <h1 className="greet-title">Mis viajes</h1>
        <p className="greet-sub">Tus puestos y en qué va cada uno.</p>
      </div>

      {!verified && bookings.length > 0 && (
        <a className="nudge" href="/verificacion">
          <span className="nudge-icon">🪪</span>
          <span className="nudge-body">
            <strong>Verifica tu identidad</strong>
            <small>Los conductores aceptan más rápido a quien tiene el sello.</small>
          </span>
          <span className="nudge-arrow">→</span>
        </a>
      )}

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
        const unread = unreadCount(b.id, 'passenger');
        const paid = isPaid(b.id);

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
                {paid ? LABEL[b.status] : 'Sin pagar'}
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
                {/* El chat va dentro de la app, no en WhatsApp: acá
                    queda el registro si algo pasa, y no hay que
                    entregar el teléfono de nadie. */}
                <a className="btn chat-cta" href={`/chat/${b.id}`}>
                  Escribirle a {trip.driver.name.split(' ')[0]}
                  {unread > 0 && <span className="cta-badge">{unread}</span>}
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
                {!paid && (
                  <a className="btn" href={`/reserva/${trip.id}?seats=${b.seats}&booking=${b.id}`}>
                    Pagar ${b.total_usd.toFixed(2)} y confirmar
                  </a>
                )}
                <a className="btn btn-ghost chat-cta" href={`/chat/${b.id}`}>
                  Escribirle a {trip.driver.name.split(' ')[0]}
                  {unread > 0 && <span className="cta-badge">{unread}</span>}
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
      </main>
      <BottomNav current="mis-viajes" user={user} />
    </>
  );
}
