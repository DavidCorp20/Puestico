'use client';

import { useState } from 'react';

const LABELS = [
  '',
  'Muy malo',
  'Malo',
  'Regular',
  'Bueno',
  'Excelente',
];

/**
 * Calificación de 1 a 5 estrellas con comentario opcional.
 *
 * Se usa de los dos lados: el pasajero califica al conductor y el
 * conductor al pasajero. `direction` decide a quién le queda la estrella.
 */
export default function RatingForm({
  bookingId,
  direction,
  targetName,
}: {
  bookingId: string;
  direction: 'passenger_to_driver' | 'driver_to_passenger';
  targetName: string;
}) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const shown = hover || stars;

  async function submit() {
    if (stars === 0) {
      setError('Elige cuántas estrellas antes de enviar.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, direction, stars, comment }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo enviar la calificación.');
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
    setTimeout(() => window.location.reload(), 1200);
  }

  if (done) {
    return (
      <div className="rating-done">
        <span>✅</span> ¡Gracias! Tu calificación quedó registrada.
      </div>
    );
  }

  return (
    <div className="rating-box">
      <div className="rating-title">
        Llegaste. ¿Cómo te trató {targetName.split(' ')[0]}?
      </div>

      <div
        className="rating-stars"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="Calificación"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            className={`rating-star ${n <= shown ? 'on' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setStars(n)}
          >
            ★
          </button>
        ))}
        <span className="rating-label">{LABELS[shown] || 'Toca una estrella'}</span>
      </div>

      <textarea
        className="rating-input"
        placeholder="Cuenta cómo fue el viaje (opcional)"
        maxLength={280}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />

      <button className="btn" onClick={submit} disabled={busy}>
        {busy ? 'Enviando…' : 'Calificar el viaje'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
