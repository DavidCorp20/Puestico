'use client';

import { useState } from 'react';

/**
 * Cancelación con la política a la vista: antes de confirmar, el pasajero
 * ve exactamente cuánto le vuelve.
 */
export default function CancelButton({
  bookingId,
  total,
  refund,
  full,
  hoursLeft,
}: {
  bookingId: string;
  total: number;
  refund: number;
  full: boolean;
  hoursLeft: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/bookings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo cancelar.');
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 10 }}
        onClick={() => setOpen(true)}
      >
        Cancelar reserva
      </button>
    );
  }

  return (
    <div className="confirm-box">
      <div className="confirm-title">¿Seguro que quieres cancelar?</div>

      <div className="row">
        <span>Pagaste</span>
        <span>${total.toFixed(2)}</span>
      </div>
      <div className="row row-total">
        <span>Te devolvemos</span>
        <span>${refund.toFixed(2)}</span>
      </div>

      <p className={`policy ${full ? 'policy-ok' : 'policy-warn'}`}>
        {full ? (
          <>
            Faltan más de 2 horas para la salida, así que la devolución es
            completa.
          </>
        ) : (
          <>
            Faltan {hoursLeft > 0 ? `${hoursLeft} h` : 'menos de 1 h'} para la
            salida. Por política, a menos de 2 horas se devuelve la mitad.
          </>
        )}
      </p>

      <div className="btn-row">
        <button className="btn btn-danger" onClick={cancel} disabled={busy}>
          {busy ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          No, mantener
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
