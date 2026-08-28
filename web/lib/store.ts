/**
 * Estado compartido del demo, en memoria del servidor.
 *
 * Permite que el lado conductor y el lado pasajero se vean entre sí:
 * el pasajero reserva y el conductor ve la solicitud; el conductor
 * acepta y el pasajero ve la confirmación.
 *
 * Se reinicia al reiniciar el servidor. Cuando conectemos la base real
 * esto se reemplaza por los repositorios de la API.
 */

import { TRIPS, MORE_TRIPS, type Trip } from './data';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface DemoBooking {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_rating: number;
  seats: number;
  status: BookingStatus;
  total_usd: number;
  commission_usd: number;
  driver_amount_usd: number;
  paid: boolean;
  created_at: string;
}

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

/** Calificación de 1 a 5 con comentario, en los dos sentidos. */
export interface DemoReview {
  id: string;
  booking_id: string;
  trip_id: string;
  /** Quién calificó: el pasajero al conductor, o al revés. */
  direction: 'passenger_to_driver' | 'driver_to_passenger';
  author_name: string;
  target_name: string;
  stars: number;
  comment: string;
  created_at: string;
}

/** Estado del alta de un conductor nuevo (onboarding simulado). */
export type DriverKycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface DriverKyc {
  driver_id: string;
  status: DriverKycStatus;
  documents: string[];
  submitted_at?: string;
  reviewed_at?: string;
}

interface Store {
  bookings: DemoBooking[];
  tripStatus: Record<string, TripStatus>;
  extraTrips: Trip[];
  reviews: DemoReview[];
  kyc: Record<string, DriverKyc>;
  seq: number;
}

/**
 * Guardamos el estado en globalThis para que sobreviva al hot-reload
 * de Next en desarrollo y sea el mismo entre rutas.
 */
const g = globalThis as unknown as { __puestico?: Store };

export const store: Store =
  g.__puestico ||
  (g.__puestico = {
    bookings: [],
    tripStatus: {},
    extraTrips: [],
    reviews: [],
    kyc: {},
    seq: 1,
  });

// Migración en caliente: si el estado venía de una versión anterior
// (hot-reload en desarrollo), completamos los campos nuevos.
store.reviews ||= [];
store.kyc ||= {};

export function allTrips(): Trip[] {
  return [...TRIPS, ...MORE_TRIPS, ...store.extraTrips];
}

export function findTrip(id: string): Trip | undefined {
  return allTrips().find((t) => t.id === id);
}

export function tripStatus(id: string): TripStatus {
  return store.tripStatus[id] || 'scheduled';
}

export function setTripStatus(id: string, status: TripStatus) {
  store.tripStatus[id] = status;
}

export function bookingsForTrip(tripId: string): DemoBooking[] {
  return store.bookings.filter((b) => b.trip_id === tripId);
}

export function bookingsForDriver(driverId: string): DemoBooking[] {
  const tripIds = allTrips()
    .filter((t) => t.driver.id === driverId)
    .map((t) => t.id);
  return store.bookings.filter((b) => tripIds.includes(b.trip_id));
}

export function bookingsForPassenger(passengerId: string): DemoBooking[] {
  return store.bookings.filter((b) => b.passenger_id === passengerId);
}

export function getBooking(id: string): DemoBooking | undefined {
  return store.bookings.find((b) => b.id === id);
}

export function nextId(prefix: string): string {
  return `${prefix}-${store.seq++}-${Date.now().toString(36)}`;
}

/** Puestos realmente libres: los del viaje menos los comprometidos. */
export function freeSeats(tripId: string): number {
  const trip = findTrip(tripId);
  if (!trip) return 0;
  const taken = bookingsForTrip(tripId)
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.seats, 0);
  return Math.max(trip.seats_available - taken, 0);
}

// ─── Calificaciones ────────────────────────────────────────

export function reviewsFor(targetName: string): DemoReview[] {
  return store.reviews.filter((r) => r.target_name === targetName);
}

export function reviewForBooking(
  bookingId: string,
  direction: DemoReview['direction'],
): DemoReview | undefined {
  return store.reviews.find(
    (r) => r.booking_id === bookingId && r.direction === direction,
  );
}

/** Promedio de las calificaciones dejadas en el demo sobre una persona. */
export function ratingFor(targetName: string, fallback: number) {
  const rs = reviewsFor(targetName);
  if (rs.length === 0) return { value: fallback, count: 0 };
  const avg = rs.reduce((s, r) => s + r.stars, 0) / rs.length;
  return { value: +avg.toFixed(1), count: rs.length };
}

// ─── Alta del conductor (onboarding simulado) ──────────────

export function kycFor(driverId: string): DriverKyc {
  return (
    store.kyc[driverId] || { driver_id: driverId, status: 'none', documents: [] }
  );
}

export function setKyc(driverId: string, kyc: DriverKyc) {
  store.kyc[driverId] = kyc;
}

// ─── Política de cancelación ───────────────────────────────

/**
 * Reembolso según la política del documento maestro:
 *  - más de 2 horas antes de la salida → devuelve todo
 *  - menos de 2 horas → devuelve la mitad
 *
 * `now` se puede inyectar para poder probar la regla.
 */
export function refundFor(
  booking: DemoBooking,
  departure: Date,
  now: Date = new Date(),
): { refund: number; full: boolean; hoursLeft: number } {
  const hoursLeft = (departure.getTime() - now.getTime()) / 3_600_000;
  const full = hoursLeft > 2;
  const refund = +(full ? booking.total_usd : booking.total_usd / 2).toFixed(2);
  return { refund, full, hoursLeft: +hoursLeft.toFixed(1) };
}

/** Fecha y hora de salida de un viaje como objeto Date. */
export function departureDate(tripId: string): Date {
  const trip = findTrip(tripId);
  if (!trip) return new Date();
  return new Date(`${trip.departure_date}T${trip.departure_time}:00`);
}

/**
 * Siembra el demo con historia: un viaje ya terminado y calificado,
 * y un conductor verificado.
 *
 * Sin esto, al reiniciar el servidor la app se ve vacía — y una demo
 * vacía no muestra el producto. Corre una sola vez por proceso.
 */
export function seedDemo() {
  if (store.bookings.length > 0 || store.reviews.length > 0) return;

  const past = allTrips().find((t) => t.id === 't-zona-08');
  if (!past) return;

  const booking: DemoBooking = {
    id: 'b-seed-1',
    trip_id: past.id,
    passenger_id: 'p2000000-0000-0000-0000-000000000001',
    passenger_name: 'Carlos Ramírez',
    passenger_rating: 4.7,
    seats: 1,
    status: 'completed',
    total_usd: 8,
    commission_usd: 1.2,
    driver_amount_usd: 6.8,
    paid: true,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  };
  store.bookings.push(booking);
  setTripStatus(past.id, 'completed');

  store.reviews.push(
    {
      id: 'r-seed-1',
      booking_id: booking.id,
      trip_id: past.id,
      direction: 'driver_to_passenger',
      author_name: past.driver.name,
      target_name: booking.passenger_name,
      stars: 5,
      comment: 'Puntual y buena conversación.',
      created_at: new Date(Date.now() - 80_000_000).toISOString(),
    },
    {
      id: 'r-seed-2',
      booking_id: 'b-seed-hist-1',
      trip_id: past.id,
      direction: 'passenger_to_driver',
      author_name: 'Beatriz Silva',
      target_name: past.driver.name,
      stars: 5,
      comment: 'Manejo tranquilo y salió a la hora exacta.',
      created_at: new Date(Date.now() - 200_000_000).toISOString(),
    },
    {
      id: 'r-seed-3',
      booking_id: 'b-seed-hist-2',
      trip_id: past.id,
      direction: 'passenger_to_driver',
      author_name: 'Diego Torres',
      target_name: past.driver.name,
      stars: 4,
      comment: 'Todo bien, el carro cómodo.',
      created_at: new Date(Date.now() - 400_000_000).toISOString(),
    },
  );

  // El conductor principal ya está verificado
  setKyc(past.driver.id, {
    driver_id: past.driver.id,
    status: 'approved',
    documents: [
      'Cédula de identidad',
      'Licencia de conducir',
      'Carnet de circulación',
    ],
    submitted_at: new Date(Date.now() - 900_000_000).toISOString(),
    reviewed_at: new Date(Date.now() - 800_000_000).toISOString(),
  });
}

seedDemo();
