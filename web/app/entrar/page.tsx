import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/session';
import { quickAccessEnabled } from '../../lib/auth';
import { homeFor } from '../../lib/guard';
import LoginFlow from './LoginFlow';
import Backdrop from './Backdrop';

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
      <Backdrop />

      <LoginFlow
        next={next}
        needsName={Boolean(user && !user.name)}
        quickAccess={quickAccessEnabled()}
      />
    </main>
  );
}
