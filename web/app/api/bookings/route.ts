import { NextResponse } from 'next/server';
import { passengerById, TEST_USERS } from '../../../lib/data';
import { quote } from '../../../lib/fare';
import {
  findTrip,
  nextId,
  bookingsForTrip,
  getBooking,
  refundFor,
  departureDate,
  insertBooking,
  cancelBooking,
  allBookings,
} from '../../../lib/store';

/**
 * Crea una solicitud de reserva.
 *
 * Replica las validaciones de bookings.service.ts del backend:
 *  - el viaje debe existir
 *  - debe haber puestos suficientes (Q10)
 *  - el conductor no puede reservar su propio viaje
 *
 * La reserva nace en 'pending': el conductor tiene que aceptarla.
 */
export async function POST(request: Request) {
  const { trip_id, passenger_id, seats, simulate } = await request.json();

  // Modo demo: permite provocar a mano un pago rechazado, para poder
  // mostrar el camino de error y no solo el camino feliz.
  if (simulate === 'payment_declined') {
    return NextResponse.json(
      {
        error:
          'El pago fue rechazado por el banco emisor. No se te cobró nada; intenta con otro medio de pago.',
        code: 'PAYMENT_DECLINED',
      },
      { status: 402 },
    );
  }

  const trip = findTrip(trip_id);
  if (!trip) {
    return NextResponse.json({ error: 'El viaje no existe' }, { status: 404 });
  }

  if (trip.driver.id === passenger_id) {
    return NextResponse.json(
      { error: 'No puedes reservar tu propio viaje' },
      { status: 400 },
    );
  }

  const requested = Number(seats) || 1;

  // Puestos ya comprometidos por reservas vivas
  const taken = bookingsForTrip(trip_id)
    .filter((b) => b.status === 'pending' || b.status === 'confirmed')
    .reduce((sum, b) => sum + b.seats, 0);
  const free = trip.seats_available - taken;

  if (requested > free) {
    return NextResponse.json(
      { error: free > 0 ? `Solo queda${free === 1 ? '' : 'n'} ${free} puesto${free === 1 ? '' : 's'} en este viaje` : 'No quedan puestos' },
      { status: 409 },
    );
  }

  const passenger = passengerById(passenger_id) || TEST_USERS[0];
  // quote() aplica el descuento por puesto adicional y la comisión
  const { total, commission, driverAmount } = quote(trip.price_usd, requested);

  const booking = {
    id: nextId('b'),
    trip_id,
    passenger_id: passenger.id,
    passenger_name: passenger.name,
    passenger_rating: passenger.rating,
    seats: requested,
    status: 'pending' as const,
    total_usd: total,
    commission_usd: commission,
    driver_amount_usd: driverAmount,
    paid: true, // pago simulado al confirmar
    created_at: new Date().toISOString(),
  };

  insertBooking(booking);
  return NextResponse.json(booking, { status: 201 });
}

/**
 * Cancela una reserva aplicando la política real:
 * más de 2 horas antes devuelve todo, menos de 2 horas la mitad.
 */
export async function DELETE(request: Request) {
  const { booking_id } = await request.json();

  const booking = getBooking(booking_id);
  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Ya está cancelada' }, { status: 400 });
  }
  if (booking.status === 'completed') {
    return NextResponse.json(
      { error: 'No se puede cancelar un viaje ya finalizado' },
      { status: 400 },
    );
  }

  const { refund, full } = refundFor(booking, departureDate(booking.trip_id));

  // cancelBooking devuelve el puesto a la disponibilidad si hacía falta
  cancelBooking(booking);

  return NextResponse.json({
    ok: true,
    refund_usd: refund,
    full_refund: full,
  });
}

export async function GET() {
  return NextResponse.json(allBookings());
}
