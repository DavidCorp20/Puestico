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

import { TRIPS, type Trip } from './data';

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

interface Store {
  bookings: DemoBooking[];
  tripStatus: Record<string, TripStatus>;
  extraTrips: Trip[];
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
    seq: 1,
  });

export function allTrips(): Trip[] {
  return [...TRIPS, ...store.extraTrips];
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
