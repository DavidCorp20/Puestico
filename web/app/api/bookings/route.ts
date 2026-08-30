import { NextResponse } from 'next/server';
import { quote } from '../../../lib/fare';
import { apiUser } from '../../../lib/guard';
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
  recordPayment,
  isPaid,
} from '../../../lib/store';

/**
 * Crea una solicitud de reserva.
 *
 * Replica las validaciones de bookings.service.ts del backend:
 *  - el viaje debe existir
 *  - debe haber puestos suficientes (Q10)
 *  - el conductor no puede reservar su propio viaje
 *
 * La reserva nace en 'pending' y SIN pagar: el conductor tiene que
 * aceptarla y el pago es un paso aparte con su propio registro.
 */
export async function POST(request: Request) {
  const { trip_id, seats, simulate } = await request.json();

  // El pasajero sale de la SESIÓN, nunca del cuerpo del pedido.
  //
  // QA reportó que un id de pasajero inexistente se sustituía en
  // silencio por el usuario de prueba: pedías una reserva con un id
  // inventado y la creaba a nombre de otra persona con un 201. La
  // causa era aceptar la identidad desde el cliente. Ahora la resuelve
  // el servidor y el agujero desaparece por construcción.
  // Reservar es exclusivo del rol pasajero: un conductor no reserva
  // puestos, publica viajes. La API lo rechaza, no solo la pantalla.
  const auth = await apiUser('passenger');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status },
    );
  }
  const user = auth.user;

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

  if (trip.driver.id === user.id) {
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

  // quote() aplica el descuento por puesto adicional y la comisión
  const { total, commission, driverAmount } = quote(trip.price_usd, requested);

  const booking = {
    id: nextId('b'),
    trip_id,
    passenger_id: user.id,
    passenger_name: user.name,
    passenger_rating: user.rating,
    seats: requested,
    status: 'pending' as const,
    total_usd: total,
    commission_usd: commission,
    driver_amount_usd: driverAmount,
    // Nace SIN pagar. Antes nacía con paid:true antes de que existiera
    // pago alguno, así que no existía el estado "reservado y no pagado"
    // — justo donde vive el riesgo de fraude.
    paid: false,
    created_at: new Date().toISOString(),
  };

  insertBooking(booking);
  return NextResponse.json(booking, { status: 201 });
}

/**
 * Pago de una reserva. Separado de la creación a propósito: el pago es
 * un hecho con su propio registro, y la reserva está pagada si y solo
 * si existe ese registro en estado `succeeded`.
 */
export async function PUT(request: Request) {
  const { booking_id, method, simulate } = await request.json();

  const auth = await apiUser('passenger');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status },
    );
  }
  const user = auth.user;

  const booking = getBooking(booking_id);
  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  // Solo el dueño de la reserva la paga.
  if (booking.passenger_id !== user.id) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  if (isPaid(booking_id)) {
    return NextResponse.json({ error: 'Esta reserva ya está pagada.' }, { status: 409 });
  }
  if (['cancelled', 'rejected'].includes(booking.status)) {
    return NextResponse.json(
      { error: 'Esta reserva ya no está activa.' },
      { status: 409 },
    );
  }

  if (simulate === 'payment_declined') {
    recordPayment(booking_id, booking.total_usd, method || 'pago_movil', 'failed');
    return NextResponse.json(
      {
        error:
          'El pago fue rechazado por el banco emisor. No se te cobró nada; intenta con otro medio de pago.',
        code: 'PAYMENT_DECLINED',
      },
      { status: 402 },
    );
  }

  const payment = recordPayment(
    booking_id,
    booking.total_usd,
    method || 'pago_movil',
    'succeeded',
    `PM-${Date.now().toString().slice(-8)}`,
  );

  return NextResponse.json({ ok: true, payment });
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
