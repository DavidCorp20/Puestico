'use client';

import { useState } from 'react';

/**
 * Reserva y pago, ahora en dos pasos reales.
 *
 * Antes esto creaba la reserva ya marcada como pagada, así que no
 * existía el estado "reservado y sin pagar" — justo donde vive el
 * riesgo de fraude, y lo que QA reportó. Ahora:
 *   1. se crea la reserva (queda sin pagar)
 *   2. se registra el pago contra esa reserva
 * Si el paso 2 falla, la reserva queda visible y sin pagar, que es la
 * verdad. Antes se perdía y el usuario no entendía qué pasó.
 *
 * Se mantiene a propósito la vía del pago rechazado: una demo donde
 * solo funciona el camino feliz no le sirve a nadie para validar.
 */
export default function PayButton({
  tripId,
  seats,
  method,
}: {
  tripId: string;
  seats: number;
  method: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [declined, setDeclined] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [bookingId, setBookingId] = useState('');

  async function pay(simulate?: string) {
    setLoading(true);
    setError('');
    setDeclined(false);
    setNeedsLogin(false);

    // Paso 1 — crear la reserva, si no existe ya de un intento anterior
    let id = bookingId;
    if (!id) {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, seats }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo reservar.');
        setNeedsLogin(
          data.code === 'AUTH_REQUIRED' || data.code === 'PROFILE_INCOMPLETE',
        );
        setLoading(false);
        return;
      }
      const booking = await res.json();
      id = booking.id;
      setBookingId(id);
    }

    // Paso 2 — pagar esa reserva
    const payRes = await fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: id, method, simulate }),
    });

    if (!payRes.ok) {
      const data = await payRes.json().catch(() => ({}));
      setError(data.error || 'No se pudo procesar el pago.');
      setDeclined(data.code === 'PAYMENT_DECLINED');
      setLoading(false);
      return;
    }

    window.location.href = `/reserva/${tripId}?seats=${seats}&paid=1&booking=${id}`;
  }

  if (needsLogin) {
    return (
      <div className="alert alert-warn">
        <strong>Entra para reservar</strong>
        {error}
        <a
          className="btn btn-sm"
          href={`/entrar?next=/reserva/${tripId}?seats=${seats}`}
          style={{ marginTop: 10 }}
        >
          Entrar con mi teléfono
        </a>
      </div>
    );
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
            <>
              <p className="note" style={{ marginTop: 8 }}>
                Tu puesto quedó apartado sin pagar. Puedes reintentar el pago
                o verlo en Mis viajes.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => pay()}
                disabled={loading}
                style={{ marginTop: 10 }}
              >
                Intentar de nuevo
              </button>
            </>
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
