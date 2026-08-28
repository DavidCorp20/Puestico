import { findTrip, tripStatus } from '../../../lib/store';
import RouteMap from '../../RouteMap';
import PanicButton from './PanicButton';
import Avatar from '../../Avatar';

export default async function Seguimiento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = findTrip(id);

  if (!trip) {
    return (
      <div className="empty">
        <span className="empty-icon">🤔</span>
        No encontramos ese viaje.
        <br />
        <a className="back-link" href="/mis-viajes">← Volver</a>
      </div>
    );
  }

  const status = tripStatus(trip.id);

  return (
    <>
      <a className="back-link" href="/mis-viajes">← Mis viajes</a>

      <h1>Tu viaje en curso</h1>
      <p className="subtitle">
        {trip.origin} → {trip.destination} · salió {trip.departure_time}
      </p>

      <div className="card" style={{ padding: 12 }}>
        <RouteMap
          origin={trip.origin}
          destination={trip.destination}
          live={status === 'active'}
        />
      </div>

      {status !== 'active' && (
        <div className="note">
          {status === 'completed'
            ? 'Este viaje ya finalizó.'
            : 'El conductor todavía no inició el viaje.'}
        </div>
      )}

      <div className="card">
        <h2>Tu conductor</h2>
        <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <Avatar name={trip.driver.name} size={54} />
          <div>
            <div className="driver-name" style={{ fontSize: '1.05rem' }}>
              {trip.driver.name}
            </div>
            <div className="driver-meta">
              ⭐ {trip.driver.rating.toFixed(1)} · {trip.vehicle.model} ·{' '}
              <strong>{trip.vehicle.plate}</strong>
            </div>
          </div>
        </div>
      </div>

      <PanicButton tripId={trip.id} />
    </>
  );
}
