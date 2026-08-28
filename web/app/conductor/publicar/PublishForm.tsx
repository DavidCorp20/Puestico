'use client';

import { useState } from 'react';
import { zonesByArea, suggestedPrice, buildRoute, routeDistanceKm, routeDuration } from '../../../lib/route';

export default function PublishForm({ driverId }: { driverId: string }) {
  const [origin, setOrigin] = useState('Guatire');
  const [destination, setDestination] = useState('Chacaíto');
  const [date, setDate] = useState('2026-09-01');
  const [time, setTime] = useState('06:30');
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState('8');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const areas = zonesByArea();
  const options = Object.entries(areas).map(([area, zones]) => (
    <optgroup key={area} label={area}>
      {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
    </optgroup>
  ));

  const route = buildRoute(origin, destination);
  const km = routeDistanceKm(route);
  const mins = routeDuration(route);
  const suggested = suggestedPrice(origin, destination);

  const total = (Number(price) || 0) * (Number(seats) || 0);
  const commission = +(total * 0.15).toFixed(2);
  const net = +(total - commission).toFixed(2);
  const sameZone = origin === destination;

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
        origin, destination, date, time, seats, price,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo publicar');
      setBusy(false);
      return;
    }
    window.location.href = `/conductor?driver=${driverId}`;
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="search-form">
        <div className="field">
          <label htmlFor="o">Desde</label>
          <select id="o" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {options}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d">Hasta</label>
          <select id="d" value={destination} onChange={(e) => setDestination(e.target.value)}>
            {options}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f">Fecha</label>
          <input id="f" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="h">Hora de salida</label>
          <input id="h" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p">Puestos libres</label>
          <select id="p" value={seats} onChange={(e) => setSeats(e.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pr">Precio por puesto (USD)</label>
          <input id="pr" type="number" min="1" step="0.5" value={price}
            onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>

      {!sameZone && (
        <div className="hint-box">
          <span>
            Ese recorrido son <strong>{km} km</strong> y unos <strong>{mins} min</strong>.
          </span>
          <button type="button" className="btn-mini" onClick={() => setPrice(String(suggested))}>
            Sugerido: ${suggested.toFixed(2)}
          </button>
        </div>
      )}

      {sameZone && (
        <p className="error-text">El origen y el destino no pueden ser la misma zona.</p>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="row">
          <span>Si se llenan los {seats} puestos</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="row">
          <span>Comisión Puestico (15%)</span>
          <span>−${commission.toFixed(2)}</span>
        </div>
        <div className="row row-total">
          <span>Recibís</span>
          <span>${net.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn" type="submit" disabled={busy || sameZone} style={{ marginTop: 16 }}>
        {busy ? 'Publicando…' : 'Publicar viaje'}
      </button>
    </form>
  );
}
