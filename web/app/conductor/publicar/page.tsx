import { TEST_DRIVERS } from '../../../lib/data';
import PublishForm from './PublishForm';
import TopBar from '../../TopBar';

export default async function Publicar({
  searchParams,
}: {
  searchParams: Promise<{ driver?: string }>;
}) {
  const sp = await searchParams;
  const driverId = sp.driver || TEST_DRIVERS[0].id;

  return (
    <>
      <TopBar title="Publicar viaje" back={`/conductor?driver=${driverId}`} />
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
