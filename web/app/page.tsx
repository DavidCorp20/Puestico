import { ORIGINS, DESTINATIONS } from '../lib/data';
import { allTrips } from '../lib/store';
import TripList from './TripList';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const origin = sp.origin || 'Guatire';
  const destination = sp.destination || 'Caracas';
  const date = sp.date || '2026-09-01';
  const searched = Boolean(sp.origin);
  const trips = allTrips()
    .filter(
      (t) =>
        t.origin === origin &&
        t.destination === destination &&
        t.departure_date === date &&
        t.seats_available > 0,
    )
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time));

  return (
    <>
      <div className="mode-switch">
        <span className="mode-tab active">Buscar</span>
        <a href="/mis-viajes" className="mode-tab">Mis viajes</a>
        <a href="/conductor" className="mode-tab">Soy conductor</a>
      </div>

      <h1>¿A dónde vas?</h1>
      <p className="subtitle">
        Reservá un puesto en un viaje que ya sale hacia tu destino.
      </p>

      <form className="card search-form" method="get">
        <div className="field">
          <label htmlFor="origin">Desde</label>
          <select id="origin" name="origin" defaultValue={origin}>
            {ORIGINS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="destination">Hasta</label>
          <select id="destination" name="destination" defaultValue={destination}>
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="field full">
          <label htmlFor="date">Fecha</label>
          <input id="date" name="date" type="date" defaultValue={date} />
        </div>

        <div className="field full">
          <button className="btn" type="submit">Buscar viajes</button>
        </div>
      </form>

      <TripList trips={trips} searched={searched} origin={origin} destination={destination} />
    </>
  );
}
