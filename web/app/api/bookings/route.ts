import { NextResponse } from 'next/server';
import { priceBreakdown, passengerById, TEST_USERS } from '../../../lib/data';
import { store, findTrip, nextId, bookingsForTrip } from '../../../lib/store';

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
  const { trip_id, passenger_id, seats } = await request.json();

  const trip = findTrip(trip_id);
  if (!trip) {
    return NextResponse.json({ error: 'El viaje no existe' }, { status: 404 });
  }

  if (trip.driver.id === passenger_id) {
    return NextResponse.json(
      { error: 'No podés reservar tu propio viaje' },
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
      { error: free > 0 ? `Solo quedan ${free} puesto(s)` : 'No quedan puestos' },
      { status: 409 },
    );
  }

  const passenger = passengerById(passenger_id) || TEST_USERS[0];
  const { total, commission, driverAmount } = priceBreakdown(
    trip.price_usd,
    requested,
  );

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

  store.bookings.push(booking);
  return NextResponse.json(booking, { status: 201 });
}

export async function GET() {
  return NextResponse.json(store.bookings);
}
