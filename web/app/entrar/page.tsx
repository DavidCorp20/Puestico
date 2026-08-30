import { redirect } from 'next/navigation';
import { currentUser } from '../../lib/session';
import TopBar from '../TopBar';
import LoginFlow from './LoginFlow';

/**
 * Inicio de sesión.
 *
 * Si ya hay sesión con nombre completo, no tiene sentido mostrar el
 * login: se vuelve a donde el usuario quería ir.
 */
export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/';

  const user = await currentUser();
  if (user && user.name) redirect(next);

  return (
    <>
      <TopBar />
      <main className="screen screen-auth" id="contenido">
        <LoginFlow next={next} needsName={Boolean(user && !user.name)} />
      </main>
    </>
  );
}
