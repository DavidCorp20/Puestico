import { priceBreakdown, TEST_USERS } from '../../../lib/data';
import { findTrip } from '../../../lib/store';
import PayButton from './PayButton';

export default async function Reserva({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ passenger?: string; seats?: string; paid?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const trip = findTrip(id);
  const seats = Number(sp.seats || 1);
  const passenger =
    TEST_USERS.find((u) => u.id === sp.passenger) || TEST_USERS[0];

  if (!trip) {
    return (
      <div className="empty">
        <span className="empty-icon">🤔</span>
        No encontramos ese viaje.
        <br />
        <a className="back-link" href="/">← Volver a buscar</a>
      </div>
    );
  }

  const { total, commission, driverAmount } = priceBreakdown(trip.price_usd, seats);

  // ─── Pantalla de confirmación ───────────────────────────
  if (sp.paid === '1') {
    return (
      <>
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="success-icon">✅</span>
          <h1>¡Reserva confirmada!</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Le llegó tu solicitud a {trip.driver.name.split(' ')[0]}. Te avisamos
            apenas la acepte.
          </p>
        </div>

        <div className="card">
          <h2>Tu conductor</h2>
          <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.6rem' }}>
              {trip.driver.photo}
            </div>
            <div>
              <div className="driver-name" style={{ fontSize: '1.05rem' }}>
                {trip.driver.name}
              </div>
              <div className="driver-meta">⭐ {trip.driver.rating.toFixed(1)}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="row">
              <span>Vehículo</span>
              <span>{trip.vehicle.model} {trip.vehicle.color}</span>
            </div>
            <div className="row">
              <span>Placa</span>
              <span><strong>{trip.vehicle.plate}</strong></span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Tu viaje</h2>
          <div className="row">
            <span>Recorrido</span>
            <span>{trip.origin} → {trip.destination}</span>
          </div>
          <div className="row">
            <span>Sale</span>
            <span>{trip.departure_date} a las {trip.departure_time}</span>
          </div>
          <div className="row">
            <span>Puestos</span>
            <span>{seats}</span>
          </div>
          <div className="row">
            <span>Pasajero</span>
            <span>{passenger.name}</span>
          </div>
          <div className="row row-total">
            <span>Pagado</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="stack">
          <a className="btn" href={`/mis-viajes?passenger=${passenger.id}`}>
            Ver mis viajes
          </a>
          <a className="btn btn-ghost" href="/">Buscar otro viaje</a>
        </div>
      </>
    );
  }

  // ─── Pantalla de pago ───────────────────────────────────
  return (
    <>
      <a className="back-link" href={`/viaje/${trip.id}`}>← Volver al viaje</a>

      <h1>Confirmá y pagá</h1>
      <p className="subtitle">Revisá que esté todo bien antes de confirmar.</p>

      <div className="card">
        <h2>Resumen</h2>
        <div className="row">
          <span>Viaje</span>
          <span>{trip.origin} → {trip.destination}</span>
        </div>
        <div className="row">
          <span>Sale</span>
          <span>{trip.departure_date} · {trip.departure_time}</span>
        </div>
        <div className="row">
          <span>Conductor</span>
          <span>{trip.driver.name}</span>
        </div>
        <div className="row">
          <span>Pasajero</span>
          <span>{passenger.name}</span>
        </div>
        <div className="row">
          <span>Puestos</span>
          <span>{seats} × ${trip.price_usd.toFixed(2)}</span>
        </div>
        <div className="row row-total">
          <span>Total a pagar</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="card">
        <h2>Cómo se reparte</h2>
        <div className="row">
          <span>Para el conductor</span>
          <span>${driverAmount.toFixed(2)}</span>
        </div>
        <div className="row">
          <span>Comisión Puestico (15%)</span>
          <span>${commission.toFixed(2)}</span>
        </div>
      </div>

      <PayButton
        tripId={trip.id}
        passenger={passenger.id}
        seats={seats}
      />

      <p className="note">
        Modo demo: no se cobra nada. Al confirmar simulamos el pago para que
        puedas ver el recorrido completo.
      </p>
    </>
  );
}
