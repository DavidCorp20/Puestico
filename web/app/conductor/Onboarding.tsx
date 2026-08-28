'use client';

import { useState } from 'react';
import { REQUIRED_DOCUMENTS } from '../../lib/kyc';

/**
 * Alta del conductor, simulada: marca los documentos como cargados,
 * queda en verificación, y un botón de operaciones lo aprueba.
 *
 * Es la pantalla que más pregunta un conductor real, así que aunque
 * la carga de archivos sea simulada, el recorrido tiene que estar.
 */
export default function Onboarding({
  driverId,
  status,
  documents,
}: {
  driverId: string;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  documents: string[];
}) {
  const [docs, setDocs] = useState<string[]>(documents);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function call(action: string, extra: object = {}) {
    setBusy(action);
    setError('');
    const res = await fetch('/api/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, driver_id: driverId, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'No se pudo completar.');
      setBusy('');
      return;
    }
    window.location.reload();
  }

  function toggle(doc: string) {
    setDocs((d) => (d.includes(doc) ? d.filter((x) => x !== doc) : [...d, doc]));
  }

  // ─── En verificación ───────────────────────────────
  if (status === 'pending') {
    return (
      <div className="card kyc kyc-pending">
        <div className="kyc-head">
          <span className="kyc-icon">⏳</span>
          <div>
            <div className="kyc-title">Tus documentos están en verificación</div>
            <div className="kyc-sub">
              Operaciones los revisa y te habilita. Suele tomar menos de 24 horas.
            </div>
          </div>
        </div>

        <ul className="kyc-list">
          {documents.map((d) => (
            <li key={d} className="kyc-item done">
              <span>✓</span> {d}
            </li>
          ))}
        </ul>

        <p className="note">
          Modo demo: acá abajo haces de operaciones para no tener que esperar.
        </p>
        <div className="btn-row">
          <button
            className="btn btn-sm"
            onClick={() => call('approve')}
            disabled={Boolean(busy)}
          >
            {busy === 'approve' ? 'Aprobando…' : 'Aprobar conductor'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => call('reject')}
            disabled={Boolean(busy)}
          >
            Rechazar
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // ─── Rechazado ─────────────────────────────────────
  if (status === 'rejected') {
    return (
      <div className="card kyc kyc-rejected">
        <div className="kyc-head">
          <span className="kyc-icon">⚠️</span>
          <div>
            <div className="kyc-title">Tus documentos fueron rechazados</div>
            <div className="kyc-sub">
              Revisa que estén legibles y vigentes, y cárgalos de nuevo.
            </div>
          </div>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => call('reset')}
          disabled={Boolean(busy)}
        >
          Cargar de nuevo
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // ─── Aprobado ──────────────────────────────────────
  if (status === 'approved') {
    return (
      <div className="card kyc kyc-approved compact">
        <div className="kyc-head">
          <span className="kyc-icon">🛡️</span>
          <div>
            <div className="kyc-title">Conductor verificado</div>
            <div className="kyc-sub">
              Tus documentos están al día. Puedes publicar viajes.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sin empezar ───────────────────────────────────
  return (
    <div className="card kyc">
      <div className="kyc-head">
        <span className="kyc-icon">📄</span>
        <div>
          <div className="kyc-title">Verifica tu cuenta para publicar viajes</div>
          <div className="kyc-sub">
            Los pasajeros solo viajan con conductores verificados. Son tres
            documentos.
          </div>
        </div>
      </div>

      <ul className="kyc-list">
        {REQUIRED_DOCUMENTS.map((d) => (
          <li key={d}>
            <button
              type="button"
              className={`kyc-item ${docs.includes(d) ? 'done' : ''}`}
              onClick={() => toggle(d)}
            >
              <span>{docs.includes(d) ? '✓' : '+'}</span> {d}
              <em>{docs.includes(d) ? 'cargado' : 'toca para cargar'}</em>
            </button>
          </li>
        ))}
      </ul>

      <button
        className="btn"
        onClick={() => call('submit', { documents: docs })}
        disabled={Boolean(busy) || docs.length < REQUIRED_DOCUMENTS.length}
      >
        {busy === 'submit' ? 'Enviando…' : 'Enviar a verificación'}
      </button>
      {docs.length < REQUIRED_DOCUMENTS.length && (
        <p className="note">
          Faltan {REQUIRED_DOCUMENTS.length - docs.length} de{' '}
          {REQUIRED_DOCUMENTS.length} documentos.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
