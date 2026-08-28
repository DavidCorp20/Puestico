import { TEST_DRIVERS, TEST_USERS } from '../lib/data';
import { bookingsForDriver, bookingsForPassenger } from '../lib/store';

/**
 * Navegación principal, compartida por las tres pestañas.
 *
 * Muestra contadores en vivo: cuántas reservas tiene el pasajero y
 * cuántas solicitudes le quedan por responder al conductor. Sin esto,
 * el usuario no sabe que del otro lado le apareció algo.
 */
export default function Tabs({
  current,
  passenger,
  driver,
}: {
  current: 'buscar' | 'mis-viajes' | 'conductor';
  passenger?: string;
  driver?: string;
}) {
  const passengerId = passenger || TEST_USERS[0].id;
  const driverId = driver || TEST_DRIVERS[0].id;

  const misViajes = bookingsForPassenger(passengerId).filter(
    (b) => b.status === 'pending' || b.status === 'confirmed',
  ).length;

  const pendientes = bookingsForDriver(driverId).filter(
    (b) => b.status === 'pending',
  ).length;

  const q = (extra: string) => (extra ? `?${extra}` : '');

  const tabs = [
    { key: 'buscar', label: 'Buscar', href: `/`, badge: 0 },
    {
      key: 'mis-viajes',
      label: 'Mis viajes',
      href: `/mis-viajes${q(`passenger=${passengerId}`)}`,
      badge: misViajes,
    },
    {
      key: 'conductor',
      label: 'Soy conductor',
      href: `/conductor${q(`driver=${driverId}`)}`,
      badge: pendientes,
    },
  ];

  return (
    <nav className="mode-switch" aria-label="Secciones">
      {tabs.map((t) =>
        t.key === current ? (
          <span key={t.key} className="mode-tab active" aria-current="page">
            {t.label}
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </span>
        ) : (
          <a key={t.key} className="mode-tab" href={t.href}>
            {t.label}
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </a>
        ),
      )}
    </nav>
  );
}
