'use client';

import { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.href = '/';
  }

  return (
    <button className="btn btn-ghost" onClick={logout} disabled={loading}>
      {loading ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
