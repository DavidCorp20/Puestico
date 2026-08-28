'use client';

import { useState } from 'react';

export default function TripControls({
  tripId,
  driverId,
  status,
  passengers,
}: {
  tripId: string;
  driverId: string;
  status: string;
  passengers: number;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function act(action: 'start' | 'finish') {
    setBusy(true);
    const res = await fetch('/api/driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, trip_id: tripId }),
    });
    const data = await res.json();
    if (action === 'finish') {
      setResult(data);
      setBusy(false);
      setTimeout(() => window.location.reload(), 2200);
      return;
    }
    window.location.reload();
  }

  if (result) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <span className="success-icon">🎉</span>
        <h2>Viaje finalizado</h2>
        <p className="subtitle">
          Llevaste {result.passengers} pasajero(s) y ganaste $
          {result.earnings_usd?.toFixed(2)}.
        </p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="note" style={{ marginTop: 14 }}>
        Este viaje ya está finalizado.
      </div>
    );
  }

  if (status === 'active') {
    return (
      <button className="btn" onClick={() => act('finish')} disabled={busy}>
        {busy ? <><span className="spinner" /> Cerrando el viaje…</> : 'Terminar viaje'}
      </button>
    );
  }

  return (
    <>
      <button
        className="btn"
        onClick={() => act('start')}
        disabled={busy || passengers === 0}
      >
        {busy ? <><span className="spinner" /> Iniciando…</> : 'Arrancar viaje'}
      </button>
      {passengers === 0 && (
        <p className="note">
          Necesitas al menos un pasajero confirmado para iniciar el viaje.
        </p>
      )}
    </>
  );
}
