import {
  bookingsForDriver,
  bookingsForPassenger,
  unreadForPassenger,
  unreadForDriver,
} from '../lib/store';
import { driverIdFor, type User } from '../lib/auth';
import {
  IconSearch,
  IconTicket,
  IconWheel,
  IconChart,
  IconChat,
  IconUser,
} from './Icons';

/**
 * Navegación inferior — distinta para cada rol.
 *
 * Antes había una sola barra con las cuatro pestañas para todos, así
 * que un pasajero veía "Conducir" y un conductor veía "Buscar puesto".
 * Eso es lo que hacía que la app se sintiera igual para los dos.
 *
 * Ahora son dos barras:
 *  · pasajero  → Buscar · Mis viajes · Mensajes · Cuenta
 *  · conductor → Viajes · Solicitudes · Mensajes · Cuenta
 *
 * Cuatro pestañas es el techo: con cinco, en un teléfono angosto los
 * textos se cortan y todo se toca por error.
 */
export type PassengerTab = 'buscar' | 'mis-viajes' | 'mensajes' | 'cuenta';
export type DriverTab = 'viajes' | 'solicitudes' | 'mensajes' | 'cuenta';

export default function BottomNav({
  current,
  user,
}: {
  current: PassengerTab | DriverTab;
  user: Pick<User, 'id' | 'role' | 'driver_ref'>;
}) {
  const isDriver = user.role === 'driver';

  const tabs = isDriver ? driverTabs(user) : passengerTabs(user);

  return (
    <nav
      className="bottom-nav"
      aria-label={
        isDriver ? 'Navegación de conductor' : 'Navegación de pasajero'
      }
    >
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
              {t.badge > 0 && (
                <span className="bn-badge">{t.badge > 9 ? '9+' : t.badge}</span>
              )}
            </span>
            <span className="bn-label">{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function passengerTabs(user: Pick<User, 'id'>) {
  const activos = bookingsForPassenger(user.id).filter(
    (b) => b.status === 'pending' || b.status === 'confirmed',
  ).length;

  return [
    {
      key: 'buscar',
      label: 'Buscar',
      href: '/buscar',
      icon: <IconSearch size={23} />,
      badge: 0,
    },
    {
      key: 'mis-viajes',
      label: 'Mis viajes',
      href: '/mis-viajes',
      icon: <IconTicket size={23} />,
      badge: activos,
    },
    {
      key: 'mensajes',
      label: 'Mensajes',
      href: '/mensajes',
      icon: <IconChat size={23} />,
      badge: unreadForPassenger(user.id),
    },
    {
      key: 'cuenta',
      label: 'Cuenta',
      href: '/cuenta',
      icon: <IconUser size={23} />,
      badge: 0,
    },
  ];
}

function driverTabs(user: Pick<User, 'id' | 'role' | 'driver_ref'>) {
  const driverId = driverIdFor(user as User) || user.id;
  const pendientes = bookingsForDriver(driverId).filter(
    (b) => b.status === 'pending',
  ).length;

  return [
    {
      key: 'viajes',
      label: 'Mis viajes',
      href: '/conductor',
      icon: <IconWheel size={23} />,
      badge: 0,
    },
    {
      key: 'solicitudes',
      label: 'Solicitudes',
      href: '/conductor/solicitudes',
      icon: <IconTicket size={23} />,
      badge: pendientes,
    },
    {
      key: 'mensajes',
      label: 'Mensajes',
      href: '/mensajes',
      icon: <IconChat size={23} />,
      badge: unreadForDriver(driverId),
    },
    {
      key: 'cuenta',
      label: 'Cuenta',
      href: '/cuenta',
      icon: <IconChart size={23} />,
      badge: 0,
    },
  ];
}
