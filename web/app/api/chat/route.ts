import { NextResponse } from 'next/server';
import { driverIdFor } from '../../../lib/auth';
import { currentUser } from '../../../lib/session';
import {
  getBooking,
  findTrip,
  insertMessage,
  messagesForBooking,
  markRead,
  nextId,
} from '../../../lib/store';

const MAX_LEN = 500;

/**
 * Chat entre pasajero y conductor, anclado a una reserva.
 *
 * La regla de acceso es el corazón de esto y va del lado servidor:
 * solo pueden leer y escribir **las dos personas de esa reserva**.
 * Sin este control, cualquiera con el id de una reserva leería una
 * conversación ajena — y los ids se ven en la barra de direcciones.
 *
 * Tampoco se puede escribir en una reserva rechazada, cancelada ni
 * terminada: el canal existe mientras exista el viaje que lo justifica.
 */
type Access =
  | { ok: true; role: 'passenger' | 'driver'; name: string; booking: ReturnType<typeof getBooking> }
  | { ok: false; status: number; error: string };

async function authorize(bookingId: string): Promise<Access> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, status: 401, error: 'Inicia sesión para escribirle al conductor.' };
  }

  const booking = getBooking(bookingId);
  if (!booking) {
    return { ok: false, status: 404, error: 'La reserva no existe.' };
  }

  const trip = findTrip(booking.trip_id);
  if (!trip) {
    return { ok: false, status: 404, error: 'El viaje no existe.' };
  }

  // ¿Soy el pasajero de esta reserva o el conductor de este viaje?
  // Comparamos contra la sesión resuelta en el servidor, nunca contra
  // un id que venga del cliente.
  if (booking.passenger_id === user.id) {
    return { ok: true, role: 'passenger', name: user.name || 'Pasajero', booking };
  }
  if (trip.driver.id === driverIdFor(user)) {
    return { ok: true, role: 'driver', name: user.name || trip.driver.name, booking };
  }

  // 404 y no 403 a propósito: un 403 confirmaría que la reserva
  // existe, que ya es información que no le corresponde.
  return { ok: false, status: 404, error: 'La reserva no existe.' };
}

export async function GET(request: Request) {
  const bookingId = new URL(request.url).searchParams.get('booking') || '';
  const access = await authorize(bookingId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  markRead(bookingId, access.role);
  return NextResponse.json({
    role: access.role,
    messages: messagesForBooking(bookingId),
  });
}

export async function POST(request: Request) {
  const { booking_id, body: text } = await request.json();
  const access = await authorize(booking_id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const booking = access.booking!;
  if (['rejected', 'cancelled'].includes(booking.status)) {
    return NextResponse.json(
      { error: 'Este viaje ya no está activo, no se puede seguir escribiendo.' },
      { status: 409 },
    );
  }

  const clean = String(text || '').trim();
  if (!clean) {
    return NextResponse.json({ error: 'Escribe algo primero.' }, { status: 400 });
  }
  if (clean.length > MAX_LEN) {
    return NextResponse.json(
      { error: `El mensaje no puede pasar de ${MAX_LEN} caracteres.` },
      { status: 400 },
    );
  }

  const message = {
    id: nextId('m'),
    booking_id,
    sender_role: access.role,
    sender_name: access.name,
    body: clean,
    created_at: new Date().toISOString(),
  };
  insertMessage(message);

  return NextResponse.json(message, { status: 201 });
}
