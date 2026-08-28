import { getTrip, TEST_USERS } from '../../../lib/data';

export default async function TripDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = getTrip(id);

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

  return (
    <>
      <a className="back-link" href="/">← Volver a los resultados</a>

      <h1>
        {trip.origin} → {trip.destination}
      </h1>
      <p className="subtitle">
        {trip.departure_date} · sale {trip.departure_time}
      </p>

      <div className="card">
        <div className="driver-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.6rem' }}>
            {trip.driver.photo}
          </div>
          <div>
            <div className="driver-name" style={{ fontSize: '1.05rem' }}>
              {trip.driver.name}
            </div>
            <div className="driver-meta">
              ⭐ {trip.driver.rating.toFixed(1)} · {trip.driver.completed_trips} viajes
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>El vehículo</h2>
        <div className="row">
          <span>Modelo</span>
          <span>{trip.vehicle.model} {trip.vehicle.year}</span>
        </div>
        <div className="row">
          <span>Color</span>
          <span>{trip.vehicle.color}</span>
        </div>
        <div className="row">
          <span>Placa</span>
          <span>{trip.vehicle.plate}</span>
        </div>
        <div className="row">
          <span>Puestos libres</span>
          <span>{trip.seats_available} de {trip.seats_total}</span>
        </div>
      </div>

      <form className="card" action={`/reserva/${trip.id}`} method="get">
        <h2>Reservar</h2>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="passenger">Viajás como</label>
          <select id="passenger" name="passenger" defaultValue={TEST_USERS[0].id}>
            {TEST_USERS.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="seats">Cuántos puestos</label>
          <select id="seats" name="seats" defaultValue="1">
            {Array.from({ length: trip.seats_available }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="row row-total">
          <span>Precio por puesto</span>
          <span>${trip.price_usd.toFixed(2)}</span>
        </div>

        <button className="btn" type="submit" style={{ marginTop: 14 }}>
          Continuar al pago
        </button>

        <p className="note">
          Modo demo: no se cobra nada real. El pago es simulado.
        </p>
      </form>
    </>
  );
}
