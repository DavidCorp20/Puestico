import { NextResponse } from 'next/server';
import {
  getBooking,
  findTrip,
  setTripStatus,
  nextId,
  insertTrip,
  confirmBooking,
  rejectBooking,
  completeTripBookings,
  freeSeats,
} from '../../../lib/store';
import { driverById } from '../../../lib/data';
import { computeFare, validatePrice } from '../../../lib/fare';
import { apiUser } from '../../../lib/guard';
import { driverIdFor } from '../../../lib/auth';

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

  // Todo lo de acá es exclusivo del rol conductor, y el conductor sale
  // de la SESIÓN. Antes se leía `driver_id` del cuerpo del pedido, que
  // es el mismo agujero que tenía la reserva con el pasajero: cualquiera
  // podía publicar viajes o aceptar solicitudes en nombre de otro.
  const auth = await apiUser('driver');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.status },
    );
  }
  const myDriverId = driverIdFor(auth.user) || auth.user.id;

  // ─── Publicar un viaje nuevo ──────────────────────────────
  if (action === 'publish') {
    const { origin, destination, date, time, seats, price } = body;
    const driver = driverById(myDriverId);
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

    // Tarifa regulada: el precio tiene que caer dentro de la banda que
    // Puestico calcula para esa distancia. Igual que Yummy o Ridery, la
    // plataforma fija el rango — el conductor elige dentro de él.
    const fare = computeFare(origin, destination, time);
    const check = validatePrice(priceNum, fare);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: check.reason,
          level: check.level,
          fare: {
            suggested: fare.suggested,
            floor: fare.floor,
            ceiling: fare.ceiling,
            km: fare.km,
          },
        },
        { status: 422 },
      );
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

    insertTrip(trip);
    return NextResponse.json(trip, { status: 201 });
  }

  // ─── Acciones sobre una reserva ───────────────────────────
  if (action === 'accept' || action === 'reject') {
    const booking = getBooking(body.booking_id);
    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }
    // La reserva tiene que pertenecer a un viaje MÍO. Sin esto, un
    // conductor acepta o rechaza solicitudes de los viajes de otro.
    const ownTrip = findTrip(booking.trip_id);
    if (!ownTrip || ownTrip.driver.id !== myDriverId) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `La reserva ya está ${booking.status}` },
        { status: 400 },
      );
    }

    if (action === 'accept') {
      const trip = ownTrip;
      if (trip && booking.seats > trip.seats_available) {
        return NextResponse.json({ error: 'Ya no hay puestos' }, { status: 409 });
      }
      confirmBooking(booking);
      return NextResponse.json({ ...booking, status: 'confirmed' });
    }

    rejectBooking(booking);
    return NextResponse.json({ ...booking, status: 'rejected' });
  }

  // ─── Acciones sobre el viaje ──────────────────────────────
  if (action === 'start' || action === 'finish') {
    const trip = findTrip(body.trip_id);
    if (!trip) {
      return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });
    }
    // Arrancar o cerrar el viaje de otro conductor movería su dinero.
    if (trip.driver.id !== myDriverId) {
      return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 });
    }

    if (action === 'start') {
      setTripStatus(trip.id, 'active');
      return NextResponse.json({ ok: true, status: 'active' });
    }

    setTripStatus(trip.id, 'completed');
    // Al cerrar el viaje, las reservas confirmadas pasan a completadas
    const confirmed = completeTripBookings(trip.id);

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
