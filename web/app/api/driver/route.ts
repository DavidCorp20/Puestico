import { NextResponse } from 'next/server';
import { getBooking, findTrip, setTripStatus, bookingsForTrip, store, nextId } from '../../../lib/store';
import { driverById, priceBreakdown } from '../../../lib/data';

/**
 * Acciones del conductor sobre reservas y viajes.
 *
 * accept / reject  → sobre una reserva pendiente
 * start / finish   → sobre el viaje completo
 * publish          → crear un viaje nuevo
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  // ─── Publicar un viaje nuevo ──────────────────────────────
  if (action === 'publish') {
    const { driver_id, origin, destination, date, time, seats, price } = body;
    const driver = driverById(driver_id);
    if (!driver) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 });
    }
    if (origin === destination) {
      return NextResponse.json(
        { error: 'El origen y el destino no pueden ser iguales' },
        { status: 400 },
      );
    }
    const priceNum = Number(price);
    const seatsNum = Number(seats);
    if (!(priceNum > 0)) {
      return NextResponse.json({ error: 'El precio debe ser mayor a cero' }, { status: 400 });
    }
    if (!(seatsNum >= 1 && seatsNum <= 6)) {
      return NextResponse.json({ error: 'Los puestos deben estar entre 1 y 6' }, { status: 400 });
    }

    const vehicles: Record<string, any> = {
      [driver.id]: { plate: 'ABC-12A', model: 'Toyota Corolla', year: 2018, color: 'Blanco' },
    };

    const trip = {
      id: nextId('t'),
      driver,
      vehicle: vehicles[driver.id] || {
        plate: 'NEW-000', model: 'Vehículo registrado', year: 2020, color: 'Gris',
      },
      origin,
      destination,
      departure_date: date,
      departure_time: time,
      seats_total: seatsNum,
      seats_available: seatsNum,
      price_usd: priceNum,
    };

    store.extraTrips.push(trip);
    return NextResponse.json(trip, { status: 201 });
  }

  // ─── Acciones sobre una reserva ───────────────────────────
  if (action === 'accept' || action === 'reject') {
    const booking = getBooking(body.booking_id);
    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `La reserva ya está ${booking.status}` },
        { status: 400 },
      );
    }

    if (action === 'accept') {
      const trip = findTrip(booking.trip_id);
      if (trip && booking.seats > trip.seats_available) {
        return NextResponse.json({ error: 'Ya no hay puestos' }, { status: 409 });
      }
      booking.status = 'confirmed';
      if (trip) trip.seats_available -= booking.seats;
    } else {
      booking.status = 'rejected';
    }
    return NextResponse.json(booking);
  }

  // ─── Acciones sobre el viaje ──────────────────────────────
  if (action === 'start' || action === 'finish') {
    const trip = findTrip(body.trip_id);
    if (!trip) {
      return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });
    }

    if (action === 'start') {
      setTripStatus(trip.id, 'active');
      return NextResponse.json({ ok: true, status: 'active' });
    }

    setTripStatus(trip.id, 'completed');
    // Al cerrar el viaje, las reservas confirmadas pasan a completadas
    const confirmed = bookingsForTrip(trip.id).filter((b) => b.status === 'confirmed');
    confirmed.forEach((b) => (b.status = 'completed'));

    const earnings = confirmed.reduce((s, b) => s + b.driver_amount_usd, 0);
    const commission = confirmed.reduce((s, b) => s + b.commission_usd, 0);

    return NextResponse.json({
      ok: true,
      status: 'completed',
      passengers: confirmed.length,
      earnings_usd: +earnings.toFixed(2),
      commission_usd: +commission.toFixed(2),
    });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}
