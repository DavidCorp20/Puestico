import { identityFor, displayPhone } from '../../lib/auth';
import { requireUser } from '../../lib/guard';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import IdentityForm from './IdentityForm';

/**
 * Verificación de identidad del pasajero.
 *
 * Por qué existe esta pantalla y no solo el KYC del conductor: en
 * carpooling el riesgo es simétrico. El conductor también se está
 * subiendo a un carro con un desconocido, y "verificado" es lo que
 * hace que acepte la solicitud. Es producto, no burocracia.
 */
export default async function Verificacion() {
  const user = await requireUser('/verificacion');

  const check = identityFor(user.id);

  return (
    <>
      <TopBar title="Verificar mi identidad" back="/cuenta" />
      <main className="screen" id="contenido">
        <div className="verif-state">
          <div className={`verif-badge state-${check.status}`}>
            {check.status === 'approved' && '✓'}
            {check.status === 'pending' && '⏳'}
            {check.status === 'rejected' && '!'}
            {check.status === 'none' && '🪪'}
          </div>
          <h1 className="verif-title">
            {check.status === 'approved' && 'Estás verificado'}
            {check.status === 'pending' && 'Estamos revisando'}
            {check.status === 'rejected' && 'Falta corregir algo'}
            {check.status === 'none' && 'Verifica quién eres'}
          </h1>
          <p className="verif-sub">
            {check.status === 'approved' &&
              'Tu perfil muestra el sello verificado. Los conductores aceptan más rápido a quien lo tiene.'}
            {check.status === 'pending' &&
              'Normalmente tardamos menos de un día. Te avisamos por WhatsApp en cuanto esté.'}
            {check.status === 'rejected' && check.reason}
            {check.status === 'none' &&
              'El conductor también se sube a un carro con un desconocido. El sello verificado es lo que hace que acepte tu solicitud sin dudar.'}
          </p>
        </div>

        <div className="card">
          <h2>Tus datos</h2>
          <div className="row">
            <span>Nombre</span>
            <span>{user.name}</span>
          </div>
          <div className="row">
            <span>Teléfono</span>
            <span>
              {displayPhone(user.phone)}{' '}
              <span className="verif-ok">✓ confirmado</span>
            </span>
          </div>
          {check.id_number && (
            <div className="row">
              <span>Cédula</span>
              <span>{check.id_number}</span>
            </div>
          )}
        </div>

        {(check.status === 'none' || check.status === 'rejected') && (
          <IdentityForm defaultName={user.name} />
        )}

        {check.status === 'pending' && (
          <div className="card">
            <h2>Mientras revisamos</h2>
            <p className="note">
              Puedes seguir buscando y reservando puestos. El sello aparece en
              tu perfil cuando quede aprobado.
            </p>
            {/* En el piloto la revisión la hace una persona desde el
                panel. Estos dos botones son ese mismo camino, expuesto
                para poder recorrer el flujo completo en la demo. */}
            <IdentityForm defaultName={user.name} reviewMode />
          </div>
        )}

        <div className="card">
          <h2>Qué hacemos con esto</h2>
          <ul className="bullets">
            <li>
              Comparamos tu cara con la foto de la cédula. Nada más.
            </li>
            <li>
              <strong>No guardamos las imágenes en la aplicación.</strong> Se
              revisan y se descartan; queda el resultado, no la foto.
            </li>
            <li>
              Tu cédula no se le muestra a ningún conductor ni pasajero: ellos
              ven el sello, no el documento.
            </li>
          </ul>
        </div>
      </main>
      <BottomNav current="cuenta" user={user} />
    </>
  );
}
