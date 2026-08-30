import { redirect } from 'next/navigation';
import { driverIdFor } from '../../../lib/auth';
import { currentUser } from '../../../lib/session';
import { getBooking, findTrip, messagesForBooking } from '../../../lib/store';
import TopBar from '../../TopBar';
import Avatar from '../../Avatar';
import ChatRoom from './ChatRoom';

/**
 * Conversación con el conductor (o con el pasajero, del otro lado).
 *
 * El control de acceso se hace acá arriba y también en la API: quien
 * no es parte de esta reserva recibe "no existe", no "no puedes". Un
 * 403 confirmaría que la reserva existe, y eso ya es información que
 * no le corresponde.
 */
export default async function Chat({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const user = await currentUser();
  if (!user) redirect(`/entrar?next=/chat/${bookingId}`);
  if (!user.name) redirect('/entrar');

  const booking = getBooking(bookingId);
  const trip = booking ? findTrip(booking.trip_id) : undefined;

  const isPassenger = booking?.passenger_id === user.id;
  const isDriver = trip?.driver.id === driverIdFor(user);

  if (!booking || !trip || (!isPassenger && !isDriver)) {
    return (
      <>
        <TopBar title="Conversación" back="/mis-viajes" />
        <main className="screen">
          <div className="empty">
            <span className="empty-icon">🤔</span>
            <strong>Esta conversación no existe</strong>
            Solo puedes escribirle a alguien con quien compartes un viaje.
            <a className="btn" href="/mis-viajes" style={{ marginTop: 14 }}>
              Ver mis viajes
            </a>
          </div>
        </main>
      </>
    );
  }

  const role: 'passenger' | 'driver' = isPassenger ? 'passenger' : 'driver';
  const otherName = isPassenger ? trip.driver.name : booking.passenger_name;
  const back = isPassenger ? '/mis-viajes' : `/conductor/viaje/${trip.id}`;
  const closed = ['rejected', 'cancelled'].includes(booking.status);

  return (
    <>
      <TopBar title={otherName.split(' ')[0]} back={back} />

      <main className="screen chat-screen" id="contenido">
        {/* Contexto del viaje arriba: en un chat de viaje, lo primero
            que uno quiere recordar es a qué hora y desde dónde. */}
        <div className="chat-context">
          <Avatar name={otherName} size={40} />
          <div className="chat-context-body">
            <strong>{otherName}</strong>
            <small>
              {trip.origin} → {trip.destination} · sale {trip.departure_time}
            </small>
          </div>
          <a className="chat-context-link" href={`/viaje/${trip.id}`}>
            Ver viaje
          </a>
        </div>

        <ChatRoom
          bookingId={bookingId}
          role={role}
          otherName={otherName}
          initial={messagesForBooking(bookingId)}
          closed={closed}
          pickup={trip.origin}
          time={trip.departure_time}
        />
      </main>
    </>
  );
}
