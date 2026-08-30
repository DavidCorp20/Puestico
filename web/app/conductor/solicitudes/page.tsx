import {
  bookingsForDriver,
  allTrips,
  ratingFor,
  unreadCount,
  reviewForBooking,
} from '../../../lib/store';
import { driverIdFor } from '../../../lib/auth';
import { requireDriver } from '../../../lib/guard';
import DriverActions from '../DriverActions';
import RatingForm from '../../RatingForm';
import Avatar from '../../Avatar';
import Stars from '../../Stars';
import TopBar from '../../TopBar';
import BottomNav from '../../BottomNav';

/**
 * Solicitudes del conductor — pestaña propia.
 *
 * Antes vivía enterrada en medio del panel, entre las estadísticas y
 * la lista de viajes. Es la única cosa de la app donde alguien está
 * esperando del otro lado, así que merece su pestaña y su contador.
 *
 * Junta las dos cosas que le piden una decisión: solicitudes por
 * responder y pasajeros por calificar.
 */
export default async function Solicitudes() {
  const user = await requireDriver('/conductor/solicitudes');
  const driverId = driverIdFor(user) || user.id;

  const bookings = bookingsForDriver(driverId);
  const pending = bookings.filter((b) => b.status === 'pending');
  const completed = bookings.filter((b) => b.status === 'completed');
  const trips = allTrips();

  const porCalificar = completed.filter(
    (b) => !reviewForBooking(b.id, 'driver_to_passenger'),
  );

  const nada = pending.length === 0 && porCalificar.length === 0;

  return (
    <>
      <TopBar />
      <main className="screen" id="contenido">
        <div className="greet">
          <h1 className="greet-title">Solicitudes</h1>
          <p className="greet-sub">
            {pending.length > 0
              ? `${pending.length} pasajero${pending.length === 1 ? '' : 's'} esperando tu respuesta.`
              : 'Nadie está esperando respuesta ahora mismo.'}
          </p>
        </div>

        {nada && (
          <div className="empty">
            <span className="empty-icon">✅</span>
            <strong>Estás al día</strong>
            Cuando alguien solicite un puesto en uno de tus viajes, aparece
            acá para que decidas.
            <a className="btn" href="/conductor" style={{ marginTop: 14 }}>
              Ver mis viajes
            </a>
          </div>
        )}

        {pending.map((b) => {
          const trip = trips.find((t) => t.id === b.trip_id);
          const pr = ratingFor(b.passenger_name, b.passenger_rating);
          const unread = unreadCount(b.id, 'driver');

          return (
            <div className="card card-alert fade-in" key={b.id}>
              <div className="driver-row flush">
                <Avatar name={b.passenger_name} />
                <div>
                  <div className="driver-name">{b.passenger_name}</div>
                  <div className="driver-meta">
                    <Stars value={pr.value} showValue count={pr.count} />
                    <span className="sep">·</span>
                    pide {b.seats} {b.seats === 1 ? 'puesto' : 'puestos'}
                  </div>
                </div>
                <span className="seats-tag accent">
                  ${b.driver_amount_usd.toFixed(2)}
                </span>
              </div>

              {trip && (
                <div className="row">
                  <span>Viaje</span>
                  <span>
                    {trip.origin} → {trip.destination} · {trip.departure_time}
                  </span>
                </div>
              )}

              {/* Poder preguntarle algo antes de decidir es lo que
                  convierte una solicitud en una decisión informada. */}
              <a className="btn btn-ghost btn-sm chat-cta" href={`/chat/${b.id}`}>
                Preguntarle algo
                {unread > 0 && <span className="cta-badge">{unread}</span>}
              </a>

              <DriverActions bookingId={b.id} driverId={driverId} />
            </div>
          );
        })}

        {porCalificar.length > 0 && (
          <>
            <h2 className="section-h">Califica a tus pasajeros</h2>
            {porCalificar.map((b) => (
              <div className="card fade-in" key={b.id}>
                <div className="driver-row flush">
                  <Avatar name={b.passenger_name} />
                  <div>
                    <div className="driver-name">{b.passenger_name}</div>
                    <div className="driver-meta">
                      Viajó contigo · {b.seats}{' '}
                      {b.seats === 1 ? 'puesto' : 'puestos'}
                    </div>
                  </div>
                </div>
                <RatingForm
                  bookingId={b.id}
                  direction="driver_to_passenger"
                  targetName={b.passenger_name}
                />
              </div>
            ))}
          </>
        )}
      </main>

      <BottomNav current="solicitudes" user={user} />
    </>
  );
}
