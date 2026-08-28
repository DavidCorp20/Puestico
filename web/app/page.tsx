import { allTrips } from '../lib/store';
import { buildRoute, routeDistanceKm } from '../lib/route';
import SearchForm from './SearchForm';
import TripList from './TripList';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    date?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const origin = sp.origin || 'Guatire';
  const destination = sp.destination || 'Chacaíto';
  const date = sp.date || '2026-09-01';
  const sort = sp.sort || 'hora';

  let trips = allTrips().filter(
    (t) =>
      t.origin === origin &&
      t.destination === destination &&
      t.departure_date === date &&
      t.seats_available > 0,
  );

  if (sort === 'precio') {
    trips = trips.sort((a, b) => a.price_usd - b.price_usd);
  } else if (sort === 'rating') {
    trips = trips.sort((a, b) => b.driver.rating - a.driver.rating);
  } else {
    trips = trips.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }

  const km = routeDistanceKm(buildRoute(origin, destination));

  // Rutas con viajes disponibles ese día, para sugerir
  const suggestions = Array.from(
    new Map(
      allTrips()
        .filter((t) => t.departure_date === date && t.seats_available > 0)
        .map((t) => [`${t.origin}|${t.destination}`, t]),
    ).values(),
  ).slice(0, 6);

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

      <SearchForm origin={origin} destination={destination} date={date} sort={sort} />

      <div className="chips">
        <span className="chips-label">Rutas con viajes hoy</span>
        <div className="chips-row">
          {suggestions.map((t) => (
            <a
              key={`${t.origin}-${t.destination}`}
              className={`chip ${t.origin === origin && t.destination === destination ? 'chip-on' : ''}`}
              href={`/?origin=${encodeURIComponent(t.origin)}&destination=${encodeURIComponent(t.destination)}&date=${date}&sort=${sort}`}
            >
              {t.origin} → {t.destination}
            </a>
          ))}
        </div>
      </div>

      <TripList
        trips={trips}
        origin={origin}
        destination={destination}
        km={km}
      />
    </>
  );
}
