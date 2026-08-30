import { TEST_DRIVERS, driverById } from '../../lib/data';
import {
  allTrips,
  bookingsForDriver,
  tripStatus,
  kycFor,
  ratingFor,
  isPaid,
} from '../../lib/store';
import Onboarding from './Onboarding';
import Avatar from '../Avatar';
import Stars from '../Stars';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import { driverIdFor } from '../../lib/auth';
import { requireDriver } from '../../lib/guard';
import { IconPlus } from '../Icons';

/**
 * Panel del conductor — su pantalla de inicio.
 *
 * Antes esta pantalla lo tenía TODO: selector de cuenta, solicitudes,
 * calificaciones pendientes, viajes y reseñas recibidas, una debajo de
 * otra. Había que bajar mucho para llegar a lo importante.
 *
 * Ahora se queda con lo que un conductor abre la app para ver — sus
 * viajes y cuánto lleva ganado — y las solicitudes tienen su propia
 * pestaña con contador, porque son la acción que no puede esperar.
 */
export default async function DriverHome() {
  // Panel de conductor: solo conductores. Un pasajero que escriba la
  // dirección a mano se va a su buscador, no ve esto.
  const user = await requireDriver('/conductor');
  const driverId = driverIdFor(user) || user.id;
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

  // Próximo viaje: es lo que de verdad quiere ver al abrir la app.
  const upcoming = myTrips
    .filter((t) => tripStatus(t.id) !== 'completed')
    .sort((a, b) =>
      `${a.departure_date}${a.departure_time}`.localeCompare(
        `${b.departure_date}${b.departure_time}`,
      ),
    );
  const activo = myTrips.find((t) => tripStatus(t.id) === 'active');

  return (
    <>
      <TopBar />
      <main className="screen" id="contenido">
        <div className="hero-driver">
          <Avatar name={driver.name} size={52} />
          <div>
            <h1 style={{ marginBottom: 2 }}>
              Hola, {driver.name.split(' ')[0]}
            </h1>
            <div className="driver-meta">
              <Stars value={rating.value} showValue count={rating.count} />
              <span className="sep">·</span>
              {completed.length} viajes en Puestico
            </div>
          </div>
        </div>

        <Onboarding
          driverId={driver.id}
          status={kyc.status}
          documents={kyc.documents}
        />

        {/* Viaje en curso arriba de todo: si está manejando, es lo único
            que importa. */}
        {activo && (
          <a className="live-banner" href={`/conductor/viaje/${activo.id}`}>
            <span className="lb-pulse" />
            <span className="lb-body">
              <strong>Viaje en curso</strong>
              <small>
                {activo.origin} → {activo.destination}
              </small>
            </span>
            <span className="lb-go">Ver →</span>
          </a>
        )}

        {/* Las solicitudes son la acción que no puede esperar: si hay,
            se avisa acá y se manda a su pestaña. */}
        {pending.length > 0 && (
          <a className="alert-banner" href="/conductor/solicitudes">
            <span className="ab-count">{pending.length}</span>
            <span className="ab-body">
              <strong>
                {pending.length === 1
                  ? 'Tienes una solicitud sin responder'
                  : `Tienes ${pending.length} solicitudes sin responder`}
              </strong>
              <small>Los pasajeros están esperando tu respuesta.</small>
            </span>
            <span className="ab-go">→</span>
          </a>
        )}

        <div className="stats">
          <div className="stat">
            <strong>{myTrips.length}</strong>
            <small>viajes publicados</small>
          </div>
          <div className="stat">
            <strong>{confirmed.length}</strong>
            <small>pasajeros confirmados</small>
          </div>
          <div className="stat">
            <strong>${earned.toFixed(2)}</strong>
            <small>ganado</small>
          </div>
        </div>

        {kyc.status === 'approved' || kyc.status === 'none' ? (
          <a className="btn btn-lg publish-cta" href="/conductor/publicar">
            <IconPlus size={20} />
            Publicar un viaje
          </a>
        ) : (
          <div className="note">
            Cuando tu cuenta esté verificada vas a poder publicar viajes.
          </div>
        )}

        <h2 className="section-h">Próximos viajes</h2>
        {upcoming.length === 0 && (
          <div className="empty">
            <span className="empty-icon">🚗</span>
            <strong>No tienes viajes programados</strong>
            Publica tu ruta habitual y los pasajeros que van para allá te
            encuentran.
          </div>
        )}
        {upcoming.map((t) => {
          const status = tripStatus(t.id);
          const tripConfirmed = confirmed.filter((b) => b.trip_id === t.id);
          const tripPending = pending.filter((b) => b.trip_id === t.id);
          const sinPagar = tripConfirmed.filter((b) => !isPaid(b.id)).length;

          return (
            <a className="trip-card" key={t.id} href={`/conductor/viaje/${t.id}`}>
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
                  {sinPagar > 0 && (
                    <span className="inline-warn">{sinPagar} sin pagar</span>
                  )}
                </div>
                <span className="seats-tag">${t.price_usd.toFixed(2)}</span>
              </div>
            </a>
          );
        })}

        {completed.length > 0 && (
          <>
            <h2 className="section-h">Historial</h2>
            <a className="link-row" href="/conductor/historial">
              <span>
                {completed.length} viaje{completed.length === 1 ? '' : 's'}{' '}
                completado{completed.length === 1 ? '' : 's'}
              </span>
              <span className="lr-go">Ver todo →</span>
            </a>
          </>
        )}
      </main>

      <BottomNav current="viajes" user={user} />
    </>
  );
}
