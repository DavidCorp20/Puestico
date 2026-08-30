'use client';

import { useState } from 'react';
import { zonesByArea } from '../../../lib/route';
import {
  computeFare,
  quote,
  validatePrice,
  driverEarnings,
  FARE,
} from '../../../lib/fare';

/**
 * Publicar un viaje.
 *
 * El foco está puesto en lo que el conductor quiere saber: cuánto le
 * queda. La tarifa la calcula la plataforma por distancia y el
 * conductor solo la mueve dentro de la banda permitida.
 */
export default function PublishForm({ driverId }: { driverId: string }) {
  const [origin, setOrigin] = useState('Guatire');
  const [destination, setDestination] = useState('Chacaíto');
  const [date, setDate] = useState('2026-09-01');
  const [time, setTime] = useState('06:30');
  const [seats, setSeats] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sameZone = origin === destination;
  const fare = computeFare(origin, destination, time);

  // El precio arranca en la tarifa sugerida y se mueve con el deslizador
  const [price, setPrice] = useState<number | null>(null);
  const effectivePrice = price ?? fare.suggested;

  const check = validatePrice(effectivePrice, fare);
  const seatsNum = Number(seats) || 1;
  const earn = driverEarnings(effectivePrice, seatsNum, fare.km);
  const q = quote(effectivePrice, seatsNum);

  const areas = zonesByArea();
  const options = Object.entries(areas).map(([area, zones]) => (
    <optgroup key={area} label={area}>
      {zones.map((z) => (
        <option key={z.id} value={z.name}>{z.name}</option>
      ))}
    </optgroup>
  ));

  function changeRoute(next: { o?: string; d?: string; t?: string }) {
    if (next.o !== undefined) setOrigin(next.o);
    if (next.d !== undefined) setDestination(next.d);
    if (next.t !== undefined) setTime(next.t);
    // Al cambiar la ruta, el precio vuelve a la sugerencia de la ruta nueva
    setPrice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'publish',
        driver_id: driverId,
        origin,
        destination,
        date,
        time,
        seats,
        price: effectivePrice,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo publicar el viaje.');
      setBusy(false);
      return;
    }
    window.location.href = '/conductor';
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="search-form">
        <div className="field">
          <label htmlFor="o">¿De dónde sales?</label>
          <select id="o" value={origin} onChange={(e) => changeRoute({ o: e.target.value })}>
            {options}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d">¿Para dónde vas?</label>
          <select id="d" value={destination} onChange={(e) => changeRoute({ d: e.target.value })}>
            {options}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f">¿Qué día?</label>
          <input id="f" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="h">¿A qué hora sales?</label>
          <input id="h" type="time" value={time} onChange={(e) => changeRoute({ t: e.target.value })} />
        </div>
        <div className="field full">
          <label htmlFor="p">¿Cuántos puestos tienes libres?</label>
          <select id="p" value={seats} onChange={(e) => setSeats(e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {sameZone ? (
        <div className="alert alert-warn">
          <strong>El origen y el destino son el mismo</strong>
          Elige dos zonas distintas para publicar el viaje.
        </div>
      ) : (
        <>
          {/* ─── Tarifa regulada ───────────────────────── */}
          <div className="fare-panel">
            <div className="fare-panel-head">
              <div>
                <span className="fare-panel-label">Tarifa sugerida por Puestico</span>
                <div className="fare-panel-price">
                  ${fare.suggested.toFixed(2)}
                  <small>por puesto</small>
                </div>
              </div>
              <div className="fare-panel-facts">
                <span>{fare.km} km</span>
                <span>{fare.minutes} min</span>
                {fare.peak && <span className="peak">hora pico</span>}
              </div>
            </div>

            <div className="fare-slider">
              <label htmlFor="pr">
                Tu precio: <strong>${effectivePrice.toFixed(2)}</strong>
              </label>
              <input
                id="pr"
                type="range"
                min={fare.floor}
                max={fare.ceiling}
                step={0.25}
                value={effectivePrice}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
              <div className="fare-slider-ends">
                <span>${fare.floor.toFixed(2)}</span>
                <span className="mid">sugerido ${fare.suggested.toFixed(2)}</span>
                <span>${fare.ceiling.toFixed(2)}</span>
              </div>
            </div>

            <p className={`fare-verdict ${check.ok ? 'ok' : 'bad'}`}>
              {check.ok
                ? `Precio dentro de la tarifa regulada para ${fare.km} km.`
                : check.reason}
            </p>
          </div>

          {/* ─── Cuánto le queda al conductor ──────────── */}
          <div className="earn-panel">
            <div className="earn-head">Si se llenan los {seatsNum} puestos</div>

            <div className="row">
              <span>
                {seatsNum} puestos × ${effectivePrice.toFixed(2)}
              </span>
              <span>${q.gross.toFixed(2)}</span>
            </div>
            {q.discount > 0 && (
              <div className="row">
                <span>
                  Descuento por grupo ({Math.round(q.discount_rate * 100)}%)
                </span>
                <span>−${q.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="row">
              <span>Cobras a los pasajeros</span>
              <span>${q.total.toFixed(2)}</span>
            </div>
            <div className="row">
              <span>
                Comisión Puestico ({Math.round(FARE.commission_rate * 100)}%)
              </span>
              <span>−${q.commission.toFixed(2)}</span>
            </div>
            <div className="row">
              <span>Gasolina estimada ({fare.km} km)</span>
              <span>−${earn.fuel.toFixed(2)}</span>
            </div>
            <div className="row row-total">
              <span>Te queda limpio</span>
              <span>${earn.net.toFixed(2)}</span>
            </div>

            <div className="earn-monthly">
              <strong>${earn.monthly.toFixed(0)}</strong>
              <span>
                al mes si haces esta ruta ida y vuelta, 22 días hábiles
              </span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="alert alert-danger">
          <strong>No se pudo publicar</strong>
          {error}
        </div>
      )}

      <button
        className="btn"
        type="submit"
        disabled={busy || sameZone || !check.ok}
      >
        {busy ? (
          <>
            <span className="spinner" /> Publicando…
          </>
        ) : (
          'Publicar mi viaje'
        )}
      </button>
    </form>
  );
}
