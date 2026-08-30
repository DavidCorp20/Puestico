import Logo from './Logo';
import { IconBack } from './Icons';
import { identityFor } from '../lib/auth';
import { currentUser } from '../lib/session';
import Avatar from './Avatar';

/**
 * Barra superior de pantalla.
 *
 * Dos formas, como en cualquier app de viaje:
 *  · raíz: marca a la izquierda y la cuenta a la derecha
 *  · interior: flecha de volver + título de la pantalla
 *
 * En la forma raíz, a la derecha va la identidad: el avatar con el
 * sello verificado si lo tiene, o "Entrar" si no hay sesión. Es lo que
 * hace que la app se sienta con dueño y no como una demo anónima.
 */
export default async function TopBar({
  title,
  back,
  action,
}: {
  title?: string;
  /** A dónde vuelve la flecha. Si no viene, es una pantalla raíz. */
  back?: string;
  action?: React.ReactNode;
}) {
  if (back) {
    return (
      <header className="topbar topbar-inner">
        <a href={back} className="tb-back" aria-label="Volver">
          <IconBack size={22} />
        </a>
        <span className="tb-title">{title}</span>
        <span className="tb-action">{action}</span>
      </header>
    );
  }

  const user = await currentUser();
  const verified = user ? identityFor(user.id).status === 'approved' : false;

  return (
    <header className="topbar">
      <a href="/" className="logo">
        <Logo size={30} />
        <span className="logo-text">
          Puestico
          <small>tu puesto, tu viaje</small>
        </span>
      </a>

      {user && user.name ? (
        <a className="tb-me" href="/cuenta" aria-label="Mi cuenta">
          <Avatar name={user.name} size={32} />
          {verified && (
            <span className="tb-verified" title="Identidad verificada">
              ✓
            </span>
          )}
        </a>
      ) : (
        <a className="btn btn-sm tb-login" href="/entrar">
          Entrar
        </a>
      )}
    </header>
  );
}
