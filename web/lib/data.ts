/**
 * Datos de prueba del MVP-0.
 *
 * Espejan exactamente el seed de la base
 * (api/src/database/seeds/001_seed_data.sql) para que, cuando conectemos
 * la API real, los identificadores y los montos coincidan.
 */

export const COMMISSION_RATE = 0.15;

export interface Driver {
  id: string;
  name: string;
  photo: string;
  rating: number;
  completed_trips: number;
}

export interface Vehicle {
  plate: string;
  model: string;
  year: number;
  color: string;
}

export interface Trip {
  id: string;
  driver: Driver;
  vehicle: Vehicle;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_usd: number;
}

export const DRIVERS: Record<string, Driver> = {
  d1: {
    id: 'd1000000-0000-0000-0000-000000000001',
    name: 'María González',
    photo: '👩',
    rating: 4.8,
    completed_trips: 45,
  },
  d2: {
    id: 'd1000000-0000-0000-0000-000000000002',
    name: 'José Rodríguez',
    photo: '👨',
    rating: 4.6,
    completed_trips: 28,
  },
  d3: {
    id: 'd1000000-0000-0000-0000-000000000003',
    name: 'Carlos Méndez',
    photo: '🧔',
    rating: 4.2,
    completed_trips: 12,
  },
  d4: {
    id: 'd1000000-0000-0000-0000-000000000004',
    name: 'Ana Pérez',
    photo: '👩‍🦱',
    rating: 5.0,
    completed_trips: 8,
  },
};

export const TRIPS: Trip[] = [
  {
    id: 't3000000-0000-0000-0000-000000000001',
    driver: DRIVERS.d1,
    vehicle: { plate: 'ABC-12A', model: 'Toyota Corolla', year: 2018, color: 'Blanco' },
    origin: 'Guatire',
    destination: 'Chacaíto',
    departure_date: '2026-09-01',
    departure_time: '06:30',
    seats_total: 3,
    seats_available: 2,
    price_usd: 6.25,
  },
  {
    id: 't3000000-0000-0000-0000-000000000002',
    driver: DRIVERS.d2,
    vehicle: { plate: 'XYZ-45B', model: 'Chevrolet Aveo', year: 2016, color: 'Plata' },
    origin: 'Guatire',
    destination: 'Chacaíto',
    departure_date: '2026-09-01',
    departure_time: '07:00',
    seats_total: 3,
    seats_available: 3,
    price_usd: 7.25,
  },
  {
    id: 't3000000-0000-0000-0000-000000000004',
    driver: DRIVERS.d4,
    vehicle: { plate: 'GHI-90D', model: 'Honda Civic', year: 2019, color: 'Rojo' },
    origin: 'Guatire',
    destination: 'Chacaíto',
    departure_date: '2026-09-01',
    departure_time: '08:15',
    seats_total: 4,
    seats_available: 3,
    price_usd: 8.25,
  },
  {
    id: 't3000000-0000-0000-0000-000000000003',
    driver: DRIVERS.d3,
    vehicle: { plate: 'DEF-78C', model: 'Ford Fiesta', year: 2020, color: 'Negro' },
    origin: 'Guarenas',
    destination: 'Chacaíto',
    departure_date: '2026-09-01',
    departure_time: '06:45',
    seats_total: 4,
    seats_available: 4,
    price_usd: 5.5,
  },
  {
    id: 't3000000-0000-0000-0000-000000000006',
    driver: DRIVERS.d1,
    vehicle: { plate: 'ABC-12A', model: 'Toyota Corolla', year: 2018, color: 'Blanco' },
    origin: 'Chacaíto',
    destination: 'Guatire',
    departure_date: '2026-09-01',
    departure_time: '17:30',
    seats_total: 3,
    seats_available: 3,
    price_usd: 7.75,
  },
];

/** Pasajeros de prueba — reemplazan el login con OTP en el MVP-0. */
export const TEST_USERS = [
  { id: 'p2000000-0000-0000-0000-000000000001', name: 'Carlos Ramírez', rating: 4.7 },
  { id: 'p2000000-0000-0000-0000-000000000002', name: 'Beatriz Silva', rating: 4.5 },
  { id: 'p2000000-0000-0000-0000-000000000003', name: 'Diego Torres', rating: 4.0 },
];


/** Viajes adicionales que cubren más zonas del área metropolitana. */
export const MORE_TRIPS: Trip[] = [
  {
    id: 't-zona-01', driver: DRIVERS.d2,
    vehicle: { plate: 'XYZ-45B', model: 'Chevrolet Aveo', year: 2016, color: 'Plata' },
    origin: 'Guatire', destination: 'Chacao',
    departure_date: '2026-09-01', departure_time: '06:15',
    seats_total: 3, seats_available: 3, price_usd: 5.75,
  },
  {
    id: 't-zona-02', driver: DRIVERS.d3,
    vehicle: { plate: 'DEF-78C', model: 'Ford Fiesta', year: 2020, color: 'Negro' },
    origin: 'Guarenas', destination: 'Altamira',
    departure_date: '2026-09-01', departure_time: '06:50',
    seats_total: 4, seats_available: 3, price_usd: 5.5,
  },
  {
    id: 't-zona-03', driver: DRIVERS.d4,
    vehicle: { plate: 'GHI-90D', model: 'Honda Civic', year: 2019, color: 'Rojo' },
    origin: 'Los Teques', destination: 'Centro de Caracas',
    departure_date: '2026-09-01', departure_time: '06:00',
    seats_total: 4, seats_available: 4, price_usd: 7.0,
  },
  {
    id: 't-zona-04', driver: DRIVERS.d1,
    vehicle: { plate: 'ABC-12A', model: 'Toyota Corolla', year: 2018, color: 'Blanco' },
    origin: 'La Guaira', destination: 'Centro de Caracas',
    departure_date: '2026-09-01', departure_time: '07:20',
    seats_total: 3, seats_available: 2, price_usd: 3.75,
  },
  {
    id: 't-zona-05', driver: DRIVERS.d2,
    vehicle: { plate: 'XYZ-45B', model: 'Chevrolet Aveo', year: 2016, color: 'Plata' },
    origin: 'Petare', destination: 'Catia',
    departure_date: '2026-09-01', departure_time: '07:45',
    seats_total: 4, seats_available: 4, price_usd: 3.75,
  },
  {
    id: 't-zona-06', driver: DRIVERS.d3,
    vehicle: { plate: 'DEF-78C', model: 'Ford Fiesta', year: 2020, color: 'Negro' },
    origin: 'Maiquetía', destination: 'Centro de Caracas',
    departure_date: '2026-09-01', departure_time: '05:40',
    seats_total: 4, seats_available: 4, price_usd: 2.75,
  },
  {
    id: 't-zona-07', driver: DRIVERS.d4,
    vehicle: { plate: 'GHI-90D', model: 'Honda Civic', year: 2019, color: 'Rojo' },
    origin: 'Guatire', destination: 'Las Mercedes',
    departure_date: '2026-09-01', departure_time: '07:10',
    seats_total: 3, seats_available: 3, price_usd: 7.75,
  },
  {
    id: 't-zona-08', driver: DRIVERS.d1,
    vehicle: { plate: 'ABC-12A', model: 'Toyota Corolla', year: 2018, color: 'Blanco' },
    origin: 'Chacaíto', destination: 'Guatire',
    departure_date: '2026-09-01', departure_time: '18:00',
    seats_total: 3, seats_available: 3, price_usd: 8.25,
  },
];

export { ZONES, zonesByArea } from './route';

export function searchTrips(origin: string, destination: string, date: string): Trip[] {
  return TRIPS.filter(
    (t) =>
      t.origin === origin &&
      t.destination === destination &&
      t.departure_date === date &&
      t.seats_available > 0,
  ).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
}

export function getTrip(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id);
}

/** Desglose de comisión — misma regla que payments.service.ts (15%). */
export function priceBreakdown(pricePerSeat: number, seats: number) {
  const total = +(pricePerSeat * seats).toFixed(2);
  const commission = +(total * COMMISSION_RATE).toFixed(2);
  const driverAmount = +(total - commission).toFixed(2);
  return { total, commission, driverAmount };
}

/** Reservas en memoria — se reinician al reiniciar el servidor. */
export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger_name: string;
  seats: number;
  status: 'pending' | 'confirmed';
  total_usd: number;
  created_at: string;
}

export const BOOKINGS: Booking[] = [];

/** Conductores de prueba para el modo conductor. */
export const TEST_DRIVERS = [
  { id: DRIVERS.d1.id, name: DRIVERS.d1.name, photo: DRIVERS.d1.photo },
  { id: DRIVERS.d2.id, name: DRIVERS.d2.name, photo: DRIVERS.d2.photo },
  { id: DRIVERS.d4.id, name: DRIVERS.d4.name, photo: DRIVERS.d4.photo },
];

export function driverById(id: string): Driver | undefined {
  return Object.values(DRIVERS).find((d) => d.id === id);
}

export function passengerById(id: string) {
  return TEST_USERS.find((u) => u.id === id);
}
