import { requireUser } from '../../lib/guard';
import { driverIdFor } from '../../lib/auth';
import {
  bookingsForPassenger,
  bookingsForDriver,
  findTrip,
  lastMessage,
  unreadCount,
} from '../../lib/store';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';
import Avatar from '../Avatar';

/**
 * Bandeja de conversaciones.
 *
 * Faltaba: el chat existía pero solo se llegaba a él desde la tarjeta
 * del viaje, así que un mensaje nuevo no tenía dónde aparecer. Ahora es
 * una pestaña con su contador.
 *
 * Sirve a los DOS roles con la misma pantalla, porque una bandeja es
 * una bandeja: lo único que cambia es de qué lado se saca la lista de
 * reservas y a quién se muestra como interlocutor.
 */
export default async function Mensajes() {
  const user = await requireUser('/mensajes');
  const isDriver = user.role === 'driver';

  const bookings = isDriver
    ? bookingsForDriver(driverIdFor(user) || user.id)
    : bookingsForPassenger(user.id);

  // Solo conversaciones vivas o con historia: una reserva rechazada y
  // sin un solo mensaje no es una conversación, es ruido.
  const chats = bookings
    .map((b) => {
      const trip = findTrip(b.trip_id);
      if (!trip) return null;
      const last = lastMessage(b.id);
      const closed = ['rejected', 'cancelled'].includes(b.status);
      if (closed && !last) return null;
      return {
        booking: b,
        trip,
        last,
        unread: unreadCount(b.id, isDriver ? 'driver' : 'passenger'),
        other: isDriver ? b.passenger_name : trip.driver.name,
        closed,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    // Lo más reciente arriba: sin mensajes, la reserva misma marca el orden.
    .sort((a, b) => {
      const ta = a.last?.created_at || a.booking.created_at;
      const tb = b.last?.created_at || b.booking.created_at;
      return tb.localeCompare(ta);
    });

  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);

  return (
    <>
      <TopBar />
      <main className="screen" id="contenido">
        <div className="greet">
          <h1 className="greet-title">Mensajes</h1>
          <p className="greet-sub">
            {totalUnread > 0
              ? `Tienes ${totalUnread} mensaje${totalUnread === 1 ? '' : 's'} sin leer.`
              : isDriver
                ? 'Tus conversaciones con los pasajeros.'
                : 'Tus conversaciones con los conductores.'}
          </p>
        </div>

        {chats.length === 0 && (
          <div className="empty">
            <span className="empty-icon">💬</span>
            <strong>Todavía no hay conversaciones</strong>
            {isDriver
              ? 'Cuando alguien solicite un puesto, podrás escribirle desde acá.'
              : 'Cuando reserves un puesto, podrás coordinar con el conductor desde acá.'}
            <a className="btn" href={isDriver ? '/conductor' : '/buscar'} style={{ marginTop: 14 }}>
              {isDriver ? 'Ver mis viajes' : 'Buscar un puesto'}
            </a>
          </div>
        )}

        {chats.map((c) => (
          <a
            className={`chat-item ${c.unread > 0 ? 'unread' : ''}`}
            key={c.booking.id}
            href={`/chat/${c.booking.id}`}
          >
            <Avatar name={c.other} size={46} />

            <span className="ci-body">
              <span className="ci-top">
                <strong>{c.other}</strong>
                {c.last && (
                  <small className="ci-time">
                    {new Date(c.last.created_at).toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                )}
              </span>

              <span className="ci-route">
                {c.trip.origin} → {c.trip.destination} · {c.trip.departure_time}
              </span>

              <span className="ci-last">
                {c.last ? (
                  <>
                    {/* Marcar lo propio hace que el hilo se entienda de
                        un vistazo, sin abrirlo. */}
                    {c.last.sender_role === (isDriver ? 'driver' : 'passenger') && (
                      <em className="ci-you">Tú: </em>
                    )}
                    {c.last.body}
                  </>
                ) : (
                  <em className="ci-none">Sin mensajes todavía</em>
                )}
              </span>
            </span>

            {c.unread > 0 && <span className="ci-badge">{c.unread}</span>}
            {c.closed && <span className="ci-closed">Cerrada</span>}
          </a>
        ))}
      </main>

      <BottomNav current="mensajes" user={user} />
    </>
  );
}
