import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/session';
import { quickAccessEnabled } from '../../lib/auth';
import { homeFor } from '../../lib/guard';
import LoginFlow from './LoginFlow';

/**
 * Pantalla de ingreso.
 *
 * Sin barra superior a propósito: es una pantalla de bienvenida a
 * pantalla completa, no una sección de la app. El fondo con el
 * corredor Guatire–Caracas se dibuja acá para que esté detrás de todos
 * los pasos.
 */
export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '';

  const user = await currentUser();
  // Con sesión completa no hay nada que hacer acá: a su app.
  if (user && user.name) redirect(next || homeFor(user));

  return (
    <main className="auth-screen" id="contenido">
      {/* Telón del corredor: montaña y ruta. Cuenta de qué es la app
          antes de leer una palabra, y es propio, no una plantilla. */}
      <div className="auth-backdrop" aria-hidden="true">
        <svg viewBox="0 0 420 560" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ab-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#12341F" />
              <stop offset="0.55" stopColor="#0F1419" />
              <stop offset="1" stopColor="#0F1419" />
            </linearGradient>
            <linearGradient id="ab-ridge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#22C55E" stopOpacity="0.16" />
              <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width="420" height="560" fill="url(#ab-sky)" />

          {/* Silueta del Ávila. */}
          <path
            d="M-20 210 L40 168 L92 196 L150 138 L214 186 L268 150 L330 192 L392 160 L440 198 L440 560 L-20 560 Z"
            fill="url(#ab-ridge)"
          />
          <path
            d="M-20 210 L40 168 L92 196 L150 138 L214 186 L268 150 L330 192 L392 160 L440 198"
            fill="none"
            stroke="#22C55E"
            strokeOpacity="0.3"
            strokeWidth="1.6"
          />

          {/* La ruta, con sus paradas. */}
          <path
            d="M36 470 C 110 470, 128 404, 196 402 C 268 400, 282 336, 372 330"
            fill="none"
            stroke="#22C55E"
            strokeOpacity="0.28"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="7 9"
          />
          <circle cx="36" cy="470" r="4.5" fill="#22C55E" fillOpacity="0.5" />
          <circle cx="196" cy="402" r="3.4" fill="#22C55E" fillOpacity="0.38" />
          <circle cx="372" cy="330" r="4.5" fill="#22C55E" fillOpacity="0.5" />
        </svg>
      </div>

      <LoginFlow
        next={next}
        needsName={Boolean(user && !user.name)}
        quickAccess={quickAccessEnabled()}
      />
    </main>
  );
}
