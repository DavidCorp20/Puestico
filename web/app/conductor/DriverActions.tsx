'use client';

import { useState } from 'react';

export default function DriverActions({
  bookingId,
  driverId,
}: {
  bookingId: string;
  driverId: string;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function act(action: 'accept' | 'reject') {
    setBusy(action);
    setError('');
    const res = await fetch('/api/driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, booking_id: bookingId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo completar');
      setBusy('');
      return;
    }
    window.location.href = `/conductor?driver=${driverId}`;
  }

  return (
    <>
      <div className="btn-row">
        <button
          className="btn"
          onClick={() => act('accept')}
          disabled={Boolean(busy)}
        >
          {busy === 'accept' ? 'Aceptando…' : 'Aceptar'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => act('reject')}
          disabled={Boolean(busy)}
        >
          {busy === 'reject' ? 'Rechazando…' : 'Rechazar'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
