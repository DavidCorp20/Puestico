import Logo from './Logo';
import { IconBack } from './Icons';

/**
 * Barra superior de pantalla.
 *
 * Dos formas, como en cualquier app de viaje:
 *  · raíz: marca a la izquierda y el sello de demo a la derecha
 *  · interior: flecha de volver + título de la pantalla
 */
export default function TopBar({
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

  return (
    <header className="topbar">
      <a href="/" className="logo">
        <Logo size={30} />
        <span className="logo-text">
          Puestico
          <small>tu puesto, tu viaje</small>
        </span>
      </a>
      <span className="badge-demo">
        <span className="dot" />
        Demo
      </span>
    </header>
  );
}
