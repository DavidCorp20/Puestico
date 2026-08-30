import PublishForm from './PublishForm';
import TopBar from '../../TopBar';
import { driverIdFor } from '../../../lib/auth';
import { requireDriver } from '../../../lib/guard';

export default async function Publicar() {
  // Publicar es exclusivo del conductor, y el perfil con el que se
  // publica sale de la sesión, no de la barra de direcciones.
  const user = await requireDriver('/conductor/publicar');
  const driverId = driverIdFor(user) || user.id;

  return (
    <>
      <TopBar title="Publicar viaje" back="/conductor" />
      <main className="screen">
        <div className="greet">
          <h1 className="greet-title">Publica tu viaje</h1>
          <p className="greet-sub">
            Di cuándo sales y cuántos puestos tienes libres.
          </p>
        </div>

        <PublishForm driverId={driverId} />
      </main>
    </>
  );
}
