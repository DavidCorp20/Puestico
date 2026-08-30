'use client';

import { useState } from 'react';

/**
 * Cambiar entre pasajero y conductor.
 *
 * El mismo teléfono, la otra app. Sin esto, alguien con carro que
 * también viaja de pasajero tendría que registrarse dos veces con dos
 * números — y perdería la mitad de su reputación en cada cuenta.
 */
export default function RoleSwitch({ role }: { role: 'passenger' | 'driver' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const target = role === 'driver' ? 'passenger' : 'driver';

  async function switchRole() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch-role', role: target }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'No se pudo cambiar.');
      setLoading(false);
      return;
    }
    window.location.href = data.home;
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={switchRole} disabled={loading}>
        {loading
          ? 'Cambiando…'
          : target === 'driver'
            ? 'Quiero ofrecer puestos (conductor)'
            : 'Quiero buscar puestos (pasajero)'}
      </button>
      {error && (
        <div className="alert alert-warn">
          <strong>No se pudo cambiar</strong>
          {error}
        </div>
      )}
      <p className="note">
        Cambias de app, no de cuenta: tu teléfono, tus calificaciones y tu
        historial siguen siendo los mismos.
      </p>
    </>
  );
}
