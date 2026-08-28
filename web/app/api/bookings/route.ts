import { NextResponse } from 'next/server';
import { BOOKINGS, getTrip, priceBreakdown, TEST_USERS } from '../../../lib/data';

/**
 * Crea una reserva en memoria.
 *
 * Replica las validaciones de api/src/modules/bookings/bookings.service.ts
 * para que el demo se comporte como el backend real:
 *  - el viaje debe existir
 *  - debe haber puestos suficientes (Q10)
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { trip_id, passenger_id, seats } = body;

  const trip = getTrip(trip_id);
  if (!trip) {
    return NextResponse.json({ error: 'El viaje no existe' }, { status: 404 });
  }

  const requested = Number(seats) || 1;
  if (requested > trip.seats_available) {
    return NextResponse.json(
      { error: `Solo quedan ${trip.seats_available} puesto(s)` },
      { status: 409 },
    );
  }

  const passenger = TEST_USERS.find((u) => u.id === passenger_id) || TEST_USERS[0];
  const { total } = priceBreakdown(trip.price_usd, requested);

  const booking = {
    id: `b-${Date.now()}`,
    trip_id,
    passenger_id: passenger.id,
    passenger_name: passenger.name,
    seats: requested,
    status: 'confirmed' as const,
    total_usd: total,
    created_at: new Date().toISOString(),
  };

  BOOKINGS.push(booking);
  trip.seats_available -= requested;

  return NextResponse.json(booking, { status: 201 });
}

export async function GET() {
  return NextResponse.json(BOOKINGS);
}
