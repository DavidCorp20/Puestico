import { searchTrips, ORIGINS, DESTINATIONS } from '../lib/data';
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
  const trips = searchTrips(origin, destination, date);

  return (
    <>
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
