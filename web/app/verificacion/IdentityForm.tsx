'use client';

import { useState } from 'react';

/**
 * Entrega de cédula + selfie.
 *
 * La imagen NO se sube a la aplicación: se elige, se confirma que
 * existe y se manda solo el hecho. Cuando haya almacenamiento real irá
 * a un bucket privado con URLs firmadas — un bucket de datos
 * biométricos mal configurado es la filtración más común que existe,
 * y esa decisión se toma ahora, no después.
 */
export default function IdentityForm({
  defaultName,
  reviewMode,
}: {
  defaultName: string;
  reviewMode?: boolean;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [idNumber, setIdNumber] = useState('');
  const [cedulaFile, setCedulaFile] = useState('');
  const [selfieFile, setSelfieFile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError('');
    const res = await fetch('/api/identidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'No se pudo enviar.');
      return;
    }
    window.location.reload();
  }

  if (reviewMode) {
    return (
      <div className="review-sim">
        <span className="review-sim-label">
          Simular la revisión (así se ve el resultado)
        </span>
        <div className="review-sim-actions">
          <button
            className="btn btn-sm"
            onClick={() => send('approve')}
            disabled={loading}
          >
            Aprobar
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => send('reject')}
            disabled={loading}
          >
            Rechazar
          </button>
        </div>
      </div>
    );
  }

  const ready =
    fullName.trim().length >= 5 && idNumber.trim().length >= 6 && cedulaFile && selfieFile;

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        send('submit', {
          full_name: fullName,
          id_number: idNumber,
          cedula: cedulaFile,
          selfie: selfieFile,
        });
      }}
    >
      <h2>Verificar mi identidad</h2>

      <div className="field">
        <label htmlFor="fn">Nombre completo, como en la cédula</label>
        <input
          id="fn"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="María Alejandra González Pérez"
        />
      </div>

      <div className="field">
        <label htmlFor="ci">Cédula de identidad</label>
        <input
          id="ci"
          type="text"
          inputMode="numeric"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="V-12345678"
        />
        <small className="field-hint">Solo los números, con o sin la V.</small>
      </div>

      <div className="upload-grid">
        <label className={`upload ${cedulaFile ? 'done' : ''}`}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCedulaFile(e.target.files?.[0]?.name || '')}
          />
          <span className="upload-icon">{cedulaFile ? '✓' : '🪪'}</span>
          <strong>Foto de la cédula</strong>
          <small>{cedulaFile ? 'Lista' : 'Que se lean los datos'}</small>
        </label>

        <label className={`upload ${selfieFile ? 'done' : ''}`}>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setSelfieFile(e.target.files?.[0]?.name || '')}
          />
          <span className="upload-icon">{selfieFile ? '✓' : '🤳'}</span>
          <strong>Foto de tu cara</strong>
          <small>{selfieFile ? 'Lista' : 'Con buena luz, sin lentes'}</small>
        </label>
      </div>

      {error && (
        <div className="alert alert-warn">
          <strong>Falta algo</strong>
          {error}
        </div>
      )}

      <button className="btn btn-lg" disabled={loading || !ready}>
        {loading ? (
          <>
            <span className="spinner" /> Enviando…
          </>
        ) : (
          'Enviar para revisión'
        )}
      </button>

      <p className="note">
        Las fotos se usan solo para comparar tu cara con la cédula y no se
        guardan en la aplicación.
      </p>
    </form>
  );
}
