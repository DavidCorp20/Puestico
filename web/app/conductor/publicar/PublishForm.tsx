'use client';

import { useState } from 'react';

export default function PublishForm({
  driverId,
  origins,
  destinations,
}: {
  driverId: string;
  origins: string[];
  destinations: string[];
}) {
  const [origin, setOrigin] = useState('Guatire');
  const [destination, setDestination] = useState('Caracas');
  const [date, setDate] = useState('2026-09-01');
  const [time, setTime] = useState('06:30');
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState('8');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = (Number(price) || 0) * (Number(seats) || 0);
  const commission = +(total * 0.15).toFixed(2);
  const net = +(total - commission).toFixed(2);

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
        price,
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
            {origins.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d">Hasta</label>
          <select id="d" value={destination} onChange={(e) => setDestination(e.target.value)}>
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
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
          <input
            id="pr"
            type="number"
            min="1"
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

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

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? 'Publicando…' : 'Publicar viaje'}
      </button>
    </form>
  );
}
