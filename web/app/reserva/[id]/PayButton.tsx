'use client';

import { useState } from 'react';

/**
 * Pago simulado.
 *
 * Incluye a propósito la vía del pago rechazado: una demo donde solo
 * funciona el camino feliz no le sirve a nadie para validar.
 */
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
  const [declined, setDeclined] = useState(false);

  async function pay(simulate?: string) {
    setLoading(true);
    setError('');
    setDeclined(false);

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: tripId,
        passenger_id: passenger,
        seats,
        simulate,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo reservar.');
      setDeclined(data.code === 'PAYMENT_DECLINED');
      setLoading(false);
      return;
    }

    window.location.href = `/reserva/${tripId}?passenger=${passenger}&seats=${seats}&paid=1`;
  }

  return (
    <>
      <button className="btn btn-lg" onClick={() => pay()} disabled={loading}>
        {loading ? (
          <>
            <span className="spinner" /> Procesando el pago…
          </>
        ) : (
          'Pagar y confirmar'
        )}
      </button>

      {error && (
        <div className={`alert ${declined ? 'alert-danger' : 'alert-warn'}`}>
          <strong>{declined ? 'Pago rechazado' : 'No se pudo reservar'}</strong>
          {error}
          {declined && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => pay()}
              disabled={loading}
              style={{ marginTop: 10 }}
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      )}

      {!error && (
        <button
          className="link-btn"
          onClick={() => pay('payment_declined')}
          disabled={loading}
        >
          Ver cómo se comporta si el pago es rechazado
        </button>
      )}
    </>
  );
}
