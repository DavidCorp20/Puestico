import { computeFare, passengerSavings, FARE } from '../lib/fare';

/**
 * Desglose de la tarifa, visible para el pasajero.
 *
 * La transparencia es el argumento: el pasajero ve que el precio sale
 * de una fórmula por distancia y tiempo, no del humor del conductor.
 * Es la diferencia con el transporte informal del corredor.
 */
export default function FareDetail({
  origin,
  destination,
  price,
  time,
}: {
  origin: string;
  destination: string;
  price: number;
  time?: string;
}) {
  const fare = computeFare(origin, destination, time);
  const savings = passengerSavings(price, fare);

  return (
    <div className="card fare-detail">
      <h2>Cómo se calcula el precio</h2>
      <p className="fare-intro">
        La tarifa la calcula Puestico según la distancia y el tiempo del
        recorrido. El conductor puede moverla solo dentro de una banda.
      </p>

      <div className="row">
        <span>Cargo base</span>
        <span>${fare.base.toFixed(2)}</span>
      </div>
      <div className="row">
        <span>
          Distancia · {fare.km} km × ${FARE.per_km_usd.toFixed(2)}
        </span>
        <span>${fare.distance.toFixed(2)}</span>
      </div>
      <div className="row">
        <span>
          Tiempo · {fare.minutes} min × ${FARE.per_min_usd.toFixed(3)}
        </span>
        <span>${fare.time.toFixed(2)}</span>
      </div>
      {fare.peak && (
        <div className="row">
          <span>Hora pico (+{Math.round(FARE.peak_surcharge * 100)}%)</span>
          <span>incluido</span>
        </div>
      )}
      <div className="row">
        <span>Tarifa sugerida</span>
        <span>${fare.suggested.toFixed(2)}</span>
      </div>
      <div className="row row-total">
        <span>Este conductor cobra</span>
        <span>${price.toFixed(2)}</span>
      </div>

      <div className="fare-band">
        <div className="fare-band-track">
          <div
            className="fare-band-marker"
            style={{
              left: `${Math.min(
                Math.max(
                  ((price - fare.floor) / (fare.ceiling - fare.floor)) * 100,
                  0,
                ),
                100,
              )}%`,
            }}
          />
        </div>
        <div className="fare-band-ends">
          <span>mín ${fare.floor.toFixed(2)}</span>
          <span>máx ${fare.ceiling.toFixed(2)}</span>
        </div>
        <p className="fare-band-note">
          Banda regulada para {fare.km} km. Fuera de este rango, Puestico no
          permite publicar el viaje.
        </p>
      </div>

      {savings.saved > 0 && (
        <div className="fare-compare">
          <div>
            <strong>${savings.taxi.toFixed(2)}</strong>
            <small>un taxi por esta ruta</small>
          </div>
          <div className="fare-compare-arrow">→</div>
          <div>
            <strong className="accent">${price.toFixed(2)}</strong>
            <small>tu puesto en Puestico</small>
          </div>
          <div className="fare-compare-save">
            −{savings.percent}%
          </div>
        </div>
      )}
    </div>
  );
}
