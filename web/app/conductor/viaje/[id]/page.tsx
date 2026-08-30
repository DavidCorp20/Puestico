import {
  findTrip,
  bookingsForTrip,
  tripStatus,
  ratingFor,
  unreadCount,
  isPaid,
} from '../../../../lib/store';
import RouteMap from '../../../RouteMap';
import TripControls from './TripControls';
import Avatar from '../../../Avatar';
import Stars from '../../../Stars';
import TopBar from '../../../TopBar';
import { redirect } from 'next/navigation';
import { driverIdFor } from '../../../../lib/auth';
import { requireDriver } from '../../../../lib/guard';

export default async function DriverTrip({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Solo conductores, y solo SUS viajes: ver el viaje de otro
  // conductor mostraría sus pasajeros y su liquidación.
  const user = await requireDriver(`/conductor/viaje/${id}`);
  const myDriverId = driverIdFor(user) || user.id;

  const trip = findTrip(id);
  if (trip && trip.driver.id !== myDriverId) redirect('/conductor');

  if (!trip) {
    return (
      <>
        <TopBar title="Viaje" back="/conductor" />
        <main className="screen">
          <div className="empty">
            <span className="empty-icon">🤔</span>
            <strong>No encontramos ese viaje</strong>
            <a className="btn" href="/conductor" style={{ marginTop: 14 }}>
              Volver a mis viajes
            </a>
          </div>
        </main>
      </>
    );
  }

  const status = tripStatus(trip.id);
  const bookings = bookingsForTrip(trip.id);
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const completed = bookings.filter((b) => b.status === 'completed');
  const active = confirmed.length ? confirmed : completed;

  const earnings = active.reduce((s, b) => s + b.driver_amount_usd, 0);
  const commission = active.reduce((s, b) => s + b.commission_usd, 0);

  return (
    <>
      <TopBar
        title={`${trip.origin} → ${trip.destination}`}
        back="/conductor" 
      />
      <main className="screen">
      <div className="trip-top">
        <div>
          <h1>{trip.origin} → {trip.destination}</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {trip.departure_date} · sale {trip.departure_time}
          </p>
        </div>
        <span className={`status-pill status-${status}`}>
          {status === 'scheduled' && 'Programado'}
          {status === 'active' && 'En curso'}
          {status === 'completed' && 'Finalizado'}
        </span>
      </div>

      <div className="card map-card">
        <RouteMap
          origin={trip.origin}
          destination={trip.destination}
          live={status === 'active'}
        />
      </div>

      <TripControls
        tripId={trip.id}
        driverId={myDriverId}
        status={status}
        passengers={active.length}
      />

      <h2 style={{ marginTop: 24 }}>
        Pasajeros ({active.length})
      </h2>
      {active.length === 0 && (
        <div className="empty">
          <span className="empty-icon">🪑</span>
          <strong>Todavía no hay pasajeros confirmados</strong>
          Cuando aceptes una solicitud, el pasajero aparece acá.
        </div>
      )}
      {active.map((b) => (
        <div className="card" key={b.id}>
          <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Avatar name={b.passenger_name} />
            <div>
              <div className="driver-name">{b.passenger_name}</div>
              <div className="driver-meta">
                <Stars
                  value={ratingFor(b.passenger_name, b.passenger_rating).value}
                  showValue
                />
                <span className="sep">·</span>
                {b.seats} {b.seats === 1 ? 'puesto' : 'puestos'}
              </div>
            </div>
            <span className="seats-tag">${b.driver_amount_usd.toFixed(2)}</span>
          </div>

          {!isPaid(b.id) && (
            <p className="note note-warn">
              Todavía no pagó su puesto.
            </p>
          )}

          {/* El chat vive dentro de la app: queda registro y nadie
              entrega su teléfono. */}
          <a className="btn btn-ghost btn-sm chat-cta" href={`/chat/${b.id}`}>
            Escribirle a {b.passenger_name.split(' ')[0]}
            {unreadCount(b.id, 'driver') > 0 && (
              <span className="cta-badge">{unreadCount(b.id, 'driver')}</span>
            )}
          </a>
        </div>
      ))}

      {active.length > 0 && (
        <div className="card">
          <h2>Cuentas del viaje</h2>
          <div className="row">
            <span>Cobrado a pasajeros</span>
            <span>${(earnings + commission).toFixed(2)}</span>
          </div>
          <div className="row">
            <span>Comisión Puestico (15%)</span>
            <span>−${commission.toFixed(2)}</span>
          </div>
          <div className="row row-total">
            <span>{status === 'completed' ? 'Ganaste' : 'Vas a recibir'}</span>
            <span>${earnings.toFixed(2)}</span>
          </div>
        </div>
      )}
      </main>
    </>
  );
}
