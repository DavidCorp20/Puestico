'use client';

import { useState } from 'react';
import PayButton from './PayButton';

/**
 * Elección del medio de pago.
 *
 * Pago móvil va primero y preseleccionado, y no es un detalle
 * estético: en un ticket de $6, una pasarela internacional con 3,5% +
 * $0,10 fijo se lleva el 34% de nuestra comisión, mientras que el pago
 * móvil venezolano la deja casi intacta. Es la palanca de margen más
 * grande del proyecto, así que la interfaz empuja hacia allá.
 */
const METHODS = [
  {
    id: 'pago_movil',
    emoji: '📲',
    name: 'Pago móvil',
    detail: 'Desde tu banco, en bolívares',
    tag: 'Recomendado',
  },
  {
    id: 'efectivo',
    emoji: '💵',
    name: 'Efectivo al conductor',
    detail: 'Le pagas al subirte',
  },
  {
    id: 'tarjeta',
    emoji: '💳',
    name: 'Tarjeta internacional',
    detail: 'Visa o Mastercard',
  },
];

export default function PayMethod({
  tripId,
  seats,
}: {
  tripId: string;
  seats: number;
}) {
  const [method, setMethod] = useState('pago_movil');

  return (
    <>
      <div className="card">
        <h2>¿Cómo pagas?</h2>
        <div className="pay-methods">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pay-method ${method === m.id ? 'on' : ''}`}
              onClick={() => setMethod(m.id)}
            >
              <span className="pm-emoji">{m.emoji}</span>
              <span className="pm-body">
                <strong>
                  {m.name}
                  {m.tag && <em className="pm-tag">{m.tag}</em>}
                </strong>
                <small>{m.detail}</small>
              </span>
              <span className="pm-radio" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <PayButton tripId={tripId} seats={seats} method={method} />
    </>
  );
}
