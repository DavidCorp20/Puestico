import { TEST_DRIVERS } from '../../../lib/data';
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
        Di cuándo sales y cuántos puestos tienes libres.
      </p>

      <PublishForm driverId={driverId} />
    </>
  );
}
