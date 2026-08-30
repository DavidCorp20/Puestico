import { NextResponse } from 'next/server';
import {
  getBooking,
  findTrip,
  nextId,
  reviewForBooking,
  insertReview,
  allReviews,
} from '../../../lib/store';

/**
 * Registra una calificación sobre una reserva ya finalizada.
 *
 * Reglas (mismas que ratings.service.ts del backend):
 *  - solo se califica un viaje completado
 *  - una sola calificación por reserva y por sentido
 *  - las estrellas van de 1 a 5
 */
export async function POST(request: Request) {
  const { booking_id, direction, stars, comment } = await request.json();

  const booking = getBooking(booking_id);
  if (!booking) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }
  if (booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'Solo se puede calificar un viaje finalizado' },
      { status: 400 },
    );
  }

  const n = Number(stars);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    return NextResponse.json(
      { error: 'Las estrellas deben ir de 1 a 5' },
      { status: 400 },
    );
  }

  if (direction !== 'passenger_to_driver' && direction !== 'driver_to_passenger') {
    return NextResponse.json({ error: 'Sentido inválido' }, { status: 400 });
  }

  if (reviewForBooking(booking_id, direction)) {
    return NextResponse.json(
      { error: 'Ya calificaste este viaje' },
      { status: 409 },
    );
  }

  const trip = findTrip(booking.trip_id);
  const driverName = trip?.driver.name || 'Conductor';

  const review = {
    id: nextId('r'),
    booking_id,
    trip_id: booking.trip_id,
    direction: direction as 'passenger_to_driver' | 'driver_to_passenger',
    author_name:
      direction === 'passenger_to_driver' ? booking.passenger_name : driverName,
    target_name:
      direction === 'passenger_to_driver' ? driverName : booking.passenger_name,
    stars: n,
    comment: String(comment || '').slice(0, 280),
    created_at: new Date().toISOString(),
  };

  insertReview(review);
  return NextResponse.json(review, { status: 201 });
}

export async function GET() {
  return NextResponse.json(allReviews());
}
