import { TEST_USERS } from '../../../lib/data';
import { quote, computeFare, passengerSavings } from '../../../lib/fare';
import { findTrip, freeSeats, ratingFor } from '../../../lib/store';
import PayButton from './PayButton';
import Avatar from '../../Avatar';
import Stars from '../../Stars';
import TopBar from '../../TopBar';

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
      <>
        <TopBar title="Reserva" back="/" />
        <main className="screen">
          <div className="empty">
            <span className="empty-icon">🤔</span>
            <strong>No encontramos ese viaje</strong>
            Puede que el conductor lo haya dado de baja.
            <a className="btn" href="/" style={{ marginTop: 14 }}>
              Volver a buscar
            </a>
          </div>
        </main>
      </>
    );
  }

  const q = quote(trip.price_usd, seats);
  const { total, commission, driverAmount } = q;
  const fare = computeFare(trip.origin, trip.destination, trip.departure_time);
  const savings = passengerSavings(q.effective_per_seat, fare);

  // ─── Pantalla de confirmación ───────────────────────────
  if (sp.paid === '1') {
    return (
      <>
        <TopBar title="Puesto reservado" back="/" />
        <main className="screen">
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="success-icon">✅</span>
          <h1>¡Puesto reservado!</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Te esperan a las {trip.departure_time} en {trip.origin}. Le llegó
            tu solicitud a {trip.driver.name.split(' ')[0]} — te avisamos en
            cuanto la acepte.
          </p>
        </div>

        <div className="card">
          <h2>Tu conductor</h2>
          <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
            <Avatar name={trip.driver.name} size={52} />
            <div>
              <div className="driver-name" style={{ fontSize: '1.05rem' }}>
                {trip.driver.name}
              </div>
              <div className="driver-meta">
                <Stars
                  value={ratingFor(trip.driver.name, trip.driver.rating).value}
                  showValue
                />
              </div>
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

        <div className="card">
          <h2>Qué sigue</h2>
          <ol className="steps">
            <li className="done">
              <span>Pagaste tu puesto</span>
              <small>El monto queda retenido hasta que el conductor acepte.</small>
            </li>
            <li className="now">
              <span>{trip.driver.name.split(' ')[0]} confirma tu puesto</span>
              <small>Te avisamos en Mis viajes en cuanto responda.</small>
            </li>
            <li>
              <span>Se coordinan el punto de encuentro</span>
              <small>Por WhatsApp, una vez confirmada la reserva.</small>
            </li>
            <li>
              <span>Viajan y se califican</span>
              <small>Al cerrar el viaje puedes calificar al conductor.</small>
            </li>
          </ol>
        </div>

        <div className="stack">
          <a className="btn" href={`/mis-viajes?passenger=${passenger.id}`}>
            Ver mis viajes
          </a>
          <a className="btn btn-ghost" href="/">Buscar otro viaje</a>
        </div>
        </main>
      </>
    );
  }

  // ─── Pantalla de pago ───────────────────────────────────
  return (
    <>
      <TopBar title="Confirma y paga" back={`/viaje/${trip.id}`} />
      <main className="screen">
      <div className="greet">
        <h1 className="greet-title">Confirma y paga</h1>
        <p className="greet-sub">Revisa que todo esté bien antes de confirmar.</p>
      </div>

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
        {q.discount > 0 && (
          <>
            <div className="row">
              <span>Subtotal</span>
              <span>${q.gross.toFixed(2)}</span>
            </div>
            <div className="row">
              <span className="accent-text">
                Descuento por {seats} puestos ({Math.round(q.discount_rate * 100)}%)
              </span>
              <span className="accent-text">−${q.discount.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="row row-total">
          <span>Total a pagar</span>
          <span>${total.toFixed(2)}</span>
        </div>
        {q.discount > 0 && (
          <p className="note note-ok">
            Te sale a ${q.effective_per_seat.toFixed(2)} el puesto: mientras más
            puestos reservas, más barato queda cada uno.
          </p>
        )}
      </div>

      {savings.saved > 0 && (
        <div className="fare-compare standalone">
          <div>
            <strong>${(savings.taxi * seats).toFixed(2)}</strong>
            <small>{seats === 1 ? 'un taxi' : `${seats} taxis`} por esta ruta</small>
          </div>
          <div className="fare-compare-arrow">→</div>
          <div>
            <strong className="accent">${total.toFixed(2)}</strong>
            <small>{seats === 1 ? 'tu puesto' : 'tus puestos'} en Puestico</small>
          </div>
          <div className="fare-compare-save">−{savings.percent}%</div>
        </div>
      )}

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
        <p className="note">
          Puestico cobra 15%. Las apps de viaje privado en Venezuela cobran
          entre 20% y 25%, así que al conductor le queda más por el mismo viaje.
        </p>
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
      </main>
    </>
  );
}
