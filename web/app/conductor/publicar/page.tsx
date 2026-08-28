import { TEST_DRIVERS, ORIGINS, DESTINATIONS } from '../../../lib/data';
import PublishForm from './PublishForm';

export default async function Publicar({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const sp = await searchParams;
  const driverId = sp.driver || TEST_DRIVERS[0].id;

  return (
    <>
      <a className="back-link" href={`/conductor?driver=${driverId}`}>
        ← Volver
      </a>
      <h1>Publicar un viaje</h1>
      <p className="subtitle">
        Contá cuándo salís y cuántos puestos tenés libres.
      </p>

      <PublishForm
        driverId={driverId}
        origins={ORIGINS}
        destinations={DESTINATIONS}
      />
    </>
  );
}
