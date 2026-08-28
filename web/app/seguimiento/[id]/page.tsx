import { findTrip, tripStatus, ratingFor } from '../../../lib/store';
import RouteMap from '../../RouteMap';
import PanicButton from './PanicButton';
import Avatar from '../../Avatar';
import Stars from '../../Stars';

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
        <strong>No encontramos ese viaje</strong>
        Puede que el conductor lo haya dado de baja.
        <a className="btn" href="/mis-viajes" style={{ marginTop: 14 }}>
          Volver a mis viajes
        </a>
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

      <div className="card map-card">
        <RouteMap
          origin={trip.origin}
          destination={trip.destination}
          live={status === 'active'}
        />
      </div>

      {status !== 'active' && (
        <div className={`alert ${status === 'completed' ? 'alert-ok' : 'alert-warn'}`}>
          <strong>
            {status === 'completed' ? 'El viaje terminó' : 'El viaje no arrancó todavía'}
          </strong>
          {status === 'completed'
            ? 'Puedes calificar al conductor desde Mis viajes.'
            : 'El conductor todavía no inició el recorrido. El mapa se mueve solo cuando arranca.'}
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
              <Stars
                value={ratingFor(trip.driver.name, trip.driver.rating).value}
                showValue
              />
              <span className="sep">·</span>
              {trip.vehicle.model} · <strong>{trip.vehicle.plate}</strong>
            </div>
          </div>
        </div>
      </div>

      <PanicButton tripId={trip.id} />
    </>
  );
}
