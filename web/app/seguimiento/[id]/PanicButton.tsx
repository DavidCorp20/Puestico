'use client';

import { useState } from 'react';

export default function PanicButton({ tripId }: { tripId: string }) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="card panic-sent">
        <strong>🚨 Alerta enviada a operaciones</strong>
        <p className="subtitle" style={{ marginBottom: 0, marginTop: 6 }}>
          Te están llamando. Mantené el teléfono a mano.
        </p>
      </div>
    );
  }

  return (
    <>
      <button className="btn btn-panic" onClick={() => setSent(true)}>
        🚨 Botón de pánico
      </button>
      <p className="note">
        Avisa a operaciones con tu ubicación y los datos del vehículo.
      </p>
    </>
  );
}
