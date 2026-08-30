import { TEST_DRIVERS, driverById } from '../../lib/data';
import {
  allTrips,
  bookingsForDriver,
  tripStatus,
  kycFor,
  ratingFor,
  reviewForBooking,
  reviewsFor,
  unreadCount,
} from '../../lib/store';
import DriverActions from './DriverActions';
import Onboarding from './Onboarding';
import Avatar from '../Avatar';
import Stars from '../Stars';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import RatingForm from '../RatingForm';
import { driverIdFor } from '../../lib/auth';
import { currentUser } from '../../lib/session';

export default async function DriverHome({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const sp = await searchParams;

  // La sesión manda: si la cuenta conduce, es su perfil de conductor.
  // El parámetro de la barra de direcciones queda solo como respaldo
  // para poder recorrer el lado conductor sin sesión en la demo.
  const user = await currentUser();
  const sessionDriver = user ? driverIdFor(user) : null;
  const driverId = sessionDriver || sp.driver || TEST_DRIVERS[0].id;
  const driver = TEST_DRIVERS.find((d) => d.id === driverId) || TEST_DRIVERS[0];
  const full = driverById(driver.id);

  const myTrips = allTrips().filter((t) => t.driver.id === driver.id);
  const myBookings = bookingsForDriver(driver.id);
  const pending = myBookings.filter((b) => b.status === 'pending');
  const confirmed = myBookings.filter((b) => b.status === 'confirmed');
  const completed = myBookings.filter((b) => b.status === 'completed');

  const earned = completed.reduce((s, b) => s + b.driver_amount_usd, 0);
  const kyc = kycFor(driver.id);
  const rating = ratingFor(driver.name, full?.rating || 5);
  const received = reviewsFor(driver.name).slice(-3).reverse();

  // Viajes terminados en los que todavía no calificó al pasajero
  const porCalificar = completed.filter(
    (b) => !reviewForBooking(b.id, 'driver_to_passenger'),
  );

  return (
    <>
      <TopBar />
      <main className="screen" id="contenido">
      <div className="hero-driver">
        <Avatar name={driver.name} size={52} />
        <div>
          <h1 style={{ marginBottom: 2 }}>Hola, {driver.name.split(' ')[0]}</h1>
          <div className="driver-meta">
            <Stars value={rating.value} showValue count={rating.count} />
            <span className="sep">·</span>
            {completed.length} viajes en Puestico
          </div>
        </div>
      </div>

      <form className="card compact" method="get">
        <div className="field">
          <label htmlFor="driver">Estás usando la cuenta de</label>
          <select id="driver" name="driver" defaultValue={driver.id}>
            {TEST_DRIVERS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" type="submit">
          Cambiar
        </button>
      </form>

      <Onboarding
        driverId={driver.id}
        status={kyc.status}
        documents={kyc.documents}
      />

      <div className="stats">
        <div className="stat">
          <strong>{myTrips.length}</strong>
          <small>viajes publicados</small>
        </div>
        <div className={`stat ${pending.length > 0 ? 'stat-alert' : ''}`}>
          <strong>{pending.length}</strong>
          <small>por responder</small>
        </div>
        <div className="stat">
          <strong>${earned.toFixed(2)}</strong>
          <small>ganado</small>
        </div>
      </div>

      {kyc.status === 'approved' || kyc.status === 'none' ? (
        <a className="btn" href={`/conductor/publicar?driver=${driver.id}`}>
          + Publicar un viaje
        </a>
      ) : (
        <div className="note">
          Cuando tu cuenta esté verificada vas a poder publicar viajes.
        </div>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="section-h">
            Solicitudes por responder
            <span className="count-pill">{pending.length}</span>
          </h2>
          {pending.map((b) => {
            const trip = myTrips.find((t) => t.id === b.trip_id);
            const pr = ratingFor(b.passenger_name, b.passenger_rating);
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
                  {unreadCount(b.id, 'driver') > 0 && (
                    <span className="cta-badge">{unreadCount(b.id, 'driver')}</span>
                  )}
                </a>
                <DriverActions bookingId={b.id} driverId={driver.id} />
              </div>
            );
          })}
        </>
      )}

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

      <h2 className="section-h">Mis viajes</h2>
      {myTrips.length === 0 && (
        <div className="empty">
          <span className="empty-icon">🚗</span>
          <strong>Todavía no publicaste ningún viaje</strong>
          Publica tu ruta habitual y los pasajeros que van para allá te
          encuentran.
        </div>
      )}
      {myTrips.map((t) => {
        const status = tripStatus(t.id);
        const tripConfirmed = confirmed.filter((b) => b.trip_id === t.id);
        const tripPending = pending.filter((b) => b.trip_id === t.id);
        return (
          <a
            className="trip-card"
            key={t.id}
            href={`/conductor/viaje/${t.id}?driver=${driver.id}`}
          >
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
                {tripConfirmed.length} confirmado
                {tripConfirmed.length === 1 ? '' : 's'} · {t.seats_available}{' '}
                {t.seats_available === 1 ? 'puesto libre' : 'puestos libres'}
                {tripPending.length > 0 && (
                  <span className="inline-alert">
                    {tripPending.length} por responder
                  </span>
                )}
              </div>
              <span className="seats-tag">${t.price_usd.toFixed(2)}</span>
            </div>
          </a>
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
      <BottomNav current="conductor" driver={driver.id} />
    </>
  );
}
