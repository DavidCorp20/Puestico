import { TEST_DRIVERS, TEST_USERS } from '../lib/data';
import {
  bookingsForDriver,
  bookingsForPassenger,
  unreadForPassenger,
  unreadForDriver,
} from '../lib/store';
import {
  IconSearch,
  IconTicket,
  IconWheel,
  IconChart,
} from './Icons';

/**
 * Barra de navegación inferior — el patrón de Yummy, Ridery y Uber.
 *
 * En el celular el pulgar llega abajo, no arriba: por eso la navegación
 * principal va acá y no en la cabecera. Los contadores siguen en vivo,
 * igual que antes, para que el usuario vea que del otro lado pasó algo.
 *
 * Los contadores ahora suman los mensajes sin leer del chat: un mensaje
 * del conductor que no se ve en la barra es un mensaje que no se lee.
 */
export default function BottomNav({
  current,
  passenger,
  driver,
}: {
  current: 'buscar' | 'mis-viajes' | 'conductor' | 'metricas';
  passenger?: string;
  driver?: string;
}) {
  const passengerId = passenger || TEST_USERS[0].id;
  const driverId = driver || TEST_DRIVERS[0].id;

  const misViajes =
    bookingsForPassenger(passengerId).filter(
      (b) => b.status === 'pending' || b.status === 'confirmed',
    ).length + unreadForPassenger(passengerId);

  const pendientes =
    bookingsForDriver(driverId).filter((b) => b.status === 'pending').length +
    unreadForDriver(driverId);

  const tabs = [
    {
      key: 'buscar',
      label: 'Buscar',
      href: '/',
      icon: <IconSearch size={23} />,
      badge: 0,
    },
    {
      key: 'mis-viajes',
      label: 'Mis viajes',
      href: `/mis-viajes?passenger=${passengerId}`,
      icon: <IconTicket size={23} />,
      badge: misViajes,
    },
    {
      key: 'conductor',
      label: 'Conducir',
      href: `/conductor?driver=${driverId}`,
      icon: <IconWheel size={23} />,
      badge: pendientes,
    },
    {
      key: 'metricas',
      label: 'Negocio',
      href: '/metricas',
      icon: <IconChart size={23} />,
      badge: 0,
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <a
            key={t.key}
            href={t.href}
            className={`bn-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bn-icon">
              {t.icon}
              {t.badge > 0 && <span className="bn-badge">{t.badge}</span>}
            </span>
            <span className="bn-label">{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
