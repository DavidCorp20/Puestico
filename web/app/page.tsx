import { allTrips, freeSeats } from '../lib/store';
import { buildRoute, routeDistanceKm, routeDuration } from '../lib/route';
import { computeFare } from '../lib/fare';
import SearchForm from './SearchForm';
import TripList from './TripList';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

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
  const fare = computeFare(origin, destination);

  const suggestions = Array.from(
    new Map(
      allTrips()
        .filter((t) => t.departure_date === date && freeSeats(t.id) > 0)
        .map((t) => [`${t.origin}|${t.destination}`, t]),
    ).values(),
  ).slice(0, 6);

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
      <TopBar />

      <main className="screen" id="contenido">
        {/* Saludo corto, como abre una app de viaje */}
        <div className="greet">
          <h1 className="greet-title">¿Para dónde vas?</h1>
          <p className="greet-sub">
            Alguien ya va para allá. Reserva tu puesto.
          </p>
        </div>

        <SearchForm
          origin={origin}
          destination={destination}
          date={date}
          sort={sort}
          suggestedFare={sameZone ? null : fare.suggested}
          km={sameZone ? null : km}
        />

        {sameZone && (
          <div className="alert alert-warn">
            <strong>El origen y el destino son el mismo</strong>
            Elige dos zonas distintas para poder buscar.
          </div>
        )}

        {suggestions.length > 0 && (
          <section className="quick">
            <h2 className="sec-title">Rutas con carros hoy</h2>
            <div className="quick-scroll">
              {suggestions.map((t) => {
                const f = computeFare(t.origin, t.destination, t.departure_time);
                const on = t.origin === origin && t.destination === destination;
                return (
                  <a
                    key={`${t.origin}-${t.destination}`}
                    className={`quick-card ${on ? 'on' : ''}`}
                    href={`/?origin=${encodeURIComponent(t.origin)}&destination=${encodeURIComponent(
                      t.destination,
                    )}&date=${date}&sort=${sort}`}
                  >
                    <span className="qc-route">
                      {t.origin}
                      <em>→</em>
                      {t.destination}
                    </span>
                    <span className="qc-meta">
                      {f.km} km · desde ${f.floor.toFixed(2)}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

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
      </main>

      <BottomNav current="buscar" />
    </>
  );
}
