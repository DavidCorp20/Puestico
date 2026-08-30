import { identityFor, displayPhone } from '../../lib/auth';
import { requireUser, homeFor } from '../../lib/guard';
import { bookingsForPassenger, ratingFor } from '../../lib/store';
import { computeFare } from '../../lib/fare';
import { findTrip } from '../../lib/store';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import Avatar from '../Avatar';
import Stars from '../Stars';
import LogoutButton from './LogoutButton';
import RoleSwitch from './RoleSwitch';

/**
 * Mi cuenta.
 *
 * El número que va arriba y grande es el AHORRO ACUMULADO, no los
 * viajes hechos. Es la razón por la que alguien no se va de la app, y
 * se calcula con datos que ya existen: la referencia de taxi
 * ($0,60/km) menos lo que realmente pagó.
 */
export default async function Cuenta() {
  const user = await requireUser('/cuenta');

  const check = identityFor(user.id);
  const bookings = bookingsForPassenger(user.id).filter(
    (b) => b.status === 'completed',
  );

  // Ahorro real: lo que habría costado en taxi menos lo que pagó.
  let taxi = 0;
  let pagado = 0;
  for (const b of bookings) {
    const trip = findTrip(b.trip_id);
    if (!trip) continue;
    const fare = computeFare(trip.origin, trip.destination, trip.departure_time);
    taxi += fare.km * 0.6 * b.seats;
    pagado += b.total_usd;
  }
  const ahorro = Math.max(taxi - pagado, 0);
  const rating = ratingFor(user.name, user.rating);

  return (
    <>
      <TopBar title="Mi cuenta" back={homeFor(user)} />
      <main className="screen" id="contenido">
        <div className="me-hero">
          <Avatar name={user.name} size={64} />
          <h1 className="me-name">{user.name}</h1>
          <div className="me-meta">
            <Stars value={rating.value} showValue count={rating.count} />
          </div>
          {check.status === 'approved' ? (
            <span className="me-verified">✓ Identidad verificada</span>
          ) : (
            <a className="me-unverified" href="/verificacion">
              {check.status === 'pending'
                ? 'Verificación en revisión'
                : 'Verifica tu identidad →'}
            </a>
          )}
        </div>

        {user.role === 'passenger' && bookings.length > 0 && (
          <div className="save-card">
            <span className="save-label">Has ahorrado</span>
            <strong className="save-amount">${ahorro.toFixed(2)}</strong>
            <small>
              contra lo que te habrían costado {bookings.length} viaje
              {bookings.length === 1 ? '' : 's'} en taxi
            </small>
          </div>
        )}

        <div className="card">
          <h2>Mis datos</h2>
          <div className="row">
            <span>Teléfono</span>
            <span>
              {displayPhone(user.phone)} <span className="verif-ok">✓</span>
            </span>
          </div>
          <div className="row">
            <span>Viajes completados</span>
            <span>{bookings.length}</span>
          </div>
          {check.id_number && (
            <div className="row">
              <span>Cédula</span>
              <span>{check.id_number}</span>
            </div>
          )}
        </div>

        {/* Cambiar de rol sin crear otra cuenta: el mismo teléfono,
            la otra app. Es lo que evita que alguien con carro se
            registre dos veces. */}
        <div className="card">
          <h2>Cómo estás usando Puestico</h2>
          <div className={`role-current role-${user.role}`}>
            <span className="rc-badge">
              {user.role === 'driver' ? '🚗' : '🎫'}
            </span>
            <span className="rc-text">
              <strong>
                {user.role === 'driver' ? 'Como conductor' : 'Como pasajero'}
              </strong>
              <small>
                {user.role === 'driver'
                  ? 'Publicas viajes y recibes solicitudes.'
                  : 'Buscas y reservas puestos.'}
              </small>
            </span>
          </div>
          <RoleSwitch role={user.role} />
        </div>

        <div className="stack">
          <a className="btn btn-ghost" href="/verificacion">
            {check.status === 'approved'
              ? 'Ver mi verificación'
              : 'Verificar mi identidad'}
          </a>
          <a
            className="btn btn-ghost"
            href={user.role === 'driver' ? '/conductor/historial' : '/mis-viajes'}
          >
            {user.role === 'driver' ? 'Mi historial' : 'Mis viajes'}
          </a>
          <LogoutButton />
        </div>
      </main>
      <BottomNav current="cuenta" user={user} />
    </>
  );
}
