import { allTrips, freeSeats } from '../lib/store';
import { buildRoute, routeDistanceKm, routeDuration } from '../lib/route';
import SearchForm from './SearchForm';
import TripList from './TripList';
import Tabs from './Tabs';

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

  const sameZone = origin === destination;

  let trips = sameZone
    ? []
    : allTrips().filter(
        (t) =>
          t.origin === origin &&
          t.destination === destination &&
          t.departure_date === date,
      );

  if (sort === 'precio') {
    trips = trips.sort((a, b) => a.price_usd - b.price_usd);
  } else if (sort === 'rating') {
    trips = trips.sort((a, b) => b.driver.rating - a.driver.rating);
  } else {
    trips = trips.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
  }

  const route = buildRoute(origin, destination);
  const km = routeDistanceKm(route);
  const minutes = routeDuration(route);

  // Rutas con viajes disponibles ese día, para sugerir
  const suggestions = Array.from(
    new Map(
      allTrips()
        .filter((t) => t.departure_date === date && freeSeats(t.id) > 0)
        .map((t) => [`${t.origin}|${t.destination}`, t]),
    ).values(),
  ).slice(0, 6);

  // Si no hay nada en esa ruta, ofrecemos otros días con viajes
  const otherDates = sameZone
    ? []
    : Array.from(
        new Set(
          allTrips()
            .filter((t) => t.origin === origin && t.destination === destination)
            .map((t) => t.departure_date),
        ),
      )
        .filter((d) => d !== date)
        .slice(0, 3);

  return (
    <>
      <Tabs current="buscar" />

      <h1>¿Para dónde vas?</h1>
      <p className="subtitle">
        Viaja con alguien que ya va hacia tu destino. Pagas el puesto, no el
        carro entero.
      </p>

      <SearchForm origin={origin} destination={destination} date={date} sort={sort} />

      {sameZone && (
        <div className="alert alert-warn">
          <strong>El origen y el destino son el mismo.</strong>
          Elige dos zonas distintas para poder buscar viajes.
        </div>
      )}

      <div className="chips">
        <span className="chips-label">Rutas con viajes hoy</span>
        <div className="chips-row">
          {suggestions.map((t) => (
            <a
              key={`${t.origin}-${t.destination}`}
              className={`chip ${
                t.origin === origin && t.destination === destination ? 'chip-on' : ''
              }`}
              href={`/?origin=${encodeURIComponent(t.origin)}&destination=${encodeURIComponent(
                t.destination,
              )}&date=${date}&sort=${sort}`}
            >
              {t.origin} → {t.destination}
            </a>
          ))}
        </div>
      </div>

      {!sameZone && (
        <TripList
          trips={trips}
          origin={origin}
          destination={destination}
          date={date}
          sort={sort}
          km={km}
          minutes={minutes}
          otherDates={otherDates}
        />
      )}
    </>
  );
}
