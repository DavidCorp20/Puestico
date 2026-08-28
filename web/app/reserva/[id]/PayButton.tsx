'use client';

import { useState } from 'react';

export default function PayButton({
  tripId,
  passenger,
  seats,
}: {
  tripId: string;
  passenger: string;
  seats: number;
}) {
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  async function pay() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId, passenger_id: passenger, seats }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo reservar');
      setLoading(false);
      return;
    }
    window.location.href = `/reserva/${tripId}?passenger=${passenger}&seats=${seats}&paid=1`;
  }

  return (
    <>
      <button className="btn" onClick={pay} disabled={loading}>
        {loading ? 'Confirmando…' : 'Confirmar pago'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
