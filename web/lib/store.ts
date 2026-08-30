/**
 * Capa de datos de Puestico — ahora con persistencia real.
 *
 * Antes esto era un objeto en memoria que se borraba al reiniciar el
 * servidor. Ahora todo pasa por SQLite (lib/db.ts), así que las
 * reservas, calificaciones, viajes publicados y verificaciones de
 * conductor sobreviven reinicios y despliegues.
 *
 * Decisión de diseño: los viajes SEMILLA siguen viviendo en código
 * (lib/data.ts) porque son datos de demostración del corredor. Lo que
 * se guarda en la base es todo lo que genera el usuario, más un delta
 * de puestos por viaje semilla para poder reconstruir la
 * disponibilidad tras un reinicio.
 *
 * Las mutaciones son funciones explícitas (confirmBooking, etc.) en vez
 * de asignaciones sobre objetos: con una base de datos detrás, mutar un
 * objeto suelto ya no persiste nada.
 */

import { TRIPS, MORE_TRIPS, DRIVERS, type Trip } from './data';
import { db, getMeta, setMeta, IS_BUILD } from './db';

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
  direction: 'passenger_to_driver' | 'driver_to_passenger';
  author_name: string;
  target_name: string;
  stars: number;
  comment: string;
  created_at: string;
}

/** Estado del alta de un conductor (onboarding). */
export type DriverKycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface DriverKyc {
  driver_id: string;
  status: DriverKycStatus;
  documents: string[];
  submitted_at?: string;
  reviewed_at?: string;
}

// ─── Conversión entre filas de SQLite y objetos de la app ──────────

type Row = Record<string, unknown>;

function toBooking(r: Row): DemoBooking {
  return {
    id: r.id as string,
    trip_id: r.trip_id as string,
    passenger_id: r.passenger_id as string,
    passenger_name: r.passenger_name as string,
    passenger_rating: r.passenger_rating as number,
    seats: r.seats as number,
    status: r.status as BookingStatus,
    total_usd: r.total_usd as number,
    commission_usd: r.commission_usd as number,
    driver_amount_usd: r.driver_amount_usd as number,
    paid: Boolean(r.paid),
    created_at: r.created_at as string,
  };
}

function toReview(r: Row): DemoReview {
  return {
    id: r.id as string,
    booking_id: r.booking_id as string,
    trip_id: r.trip_id as string,
    direction: r.direction as DemoReview['direction'],
    author_name: r.author_name as string,
    target_name: r.target_name as string,
    stars: r.stars as number,
    comment: r.comment as string,
    created_at: r.created_at as string,
  };
}

function toTrip(r: Row): Trip {
  const driver =
    Object.values(DRIVERS).find((d) => d.id === (r.driver_id as string)) ||
    DRIVERS.d1;
  return {
    id: r.id as string,
    driver,
    vehicle: {
      plate: r.plate as string,
      model: r.model as string,
      year: r.year as number,
      color: r.color as string,
    },
    origin: r.origin as string,
    destination: r.destination as string,
    departure_date: r.departure_date as string,
    departure_time: r.departure_time as string,
    seats_total: r.seats_total as number,
    seats_available: r.seats_available as number,
    price_usd: r.price_usd as number,
  };
}

// ─── Viajes ────────────────────────────────────────────────────────

/** Viajes publicados por conductores, guardados en la base. */
function storedTrips(): Trip[] {
  return (db.prepare('SELECT * FROM trips ORDER BY created_at').all() as Row[]).map(
    toTrip,
  );
}

/** Ajustes de puestos sobre los viajes semilla. */
function seatAdjustments(): Record<string, number> {
  const rows = db.prepare('SELECT trip_id, delta FROM seat_adjustments').all() as Row[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.trip_id as string] = r.delta as number;
  return out;
}

/**
 * Todos los viajes: los semilla (con su disponibilidad ajustada) más
 * los publicados por conductores.
 */
export function allTrips(): Trip[] {
  const adj = seatAdjustments();
  const seeds = [...TRIPS, ...MORE_TRIPS].map((t) => {
    const delta = adj[t.id] || 0;
    return delta === 0
      ? t
      : {
          ...t,
          seats_available: Math.max(t.seats_available + delta, 0),
        };
  });
  return [...seeds, ...storedTrips()];
}

export function findTrip(id: string): Trip | undefined {
  return allTrips().find((t) => t.id === id);
}

/** Mueve la disponibilidad de un viaje, sea semilla o publicado. */
function adjustSeats(tripId: string, delta: number) {
  const stored = db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId);
  if (stored) {
    db.prepare(
      'UPDATE trips SET seats_available = MAX(seats_available + ?, 0) WHERE id = ?',
    ).run(delta, tripId);
    return;
  }
  db.prepare(
    `INSERT INTO seat_adjustments (trip_id, delta) VALUES (?, ?)
     ON CONFLICT(trip_id) DO UPDATE SET delta = delta + excluded.delta`,
  ).run(tripId, delta);
}

export function insertTrip(trip: Trip) {
  db.prepare(
    `INSERT INTO trips (id, driver_id, plate, model, year, color, origin,
       destination, departure_date, departure_time, seats_total,
       seats_available, price_usd, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    trip.id,
    trip.driver.id,
    trip.vehicle.plate,
    trip.vehicle.model,
    trip.vehicle.year,
    trip.vehicle.color,
    trip.origin,
    trip.destination,
    trip.departure_date,
    trip.departure_time,
    trip.seats_total,
    trip.seats_available,
    trip.price_usd,
    new Date().toISOString(),
  );
}

// ─── Estado del viaje ──────────────────────────────────────────────

export function tripStatus(id: string): TripStatus {
  const row = db.prepare('SELECT status FROM trip_status WHERE trip_id = ?').get(id) as
    | { status: string }
    | undefined;
  return (row?.status as TripStatus) || 'scheduled';
}

export function setTripStatus(id: string, status: TripStatus) {
  db.prepare(
    `INSERT INTO trip_status (trip_id, status) VALUES (?, ?)
     ON CONFLICT(trip_id) DO UPDATE SET status = excluded.status`,
  ).run(id, status);
}

// ─── Reservas ──────────────────────────────────────────────────────

export function bookingsForTrip(tripId: string): DemoBooking[] {
  return (
    db.prepare('SELECT * FROM bookings WHERE trip_id = ? ORDER BY created_at').all(
      tripId,
    ) as Row[]
  ).map(toBooking);
}

export function bookingsForDriver(driverId: string): DemoBooking[] {
  const tripIds = allTrips()
    .filter((t) => t.driver.id === driverId)
    .map((t) => t.id);
  if (tripIds.length === 0) return [];
  const marks = tripIds.map(() => '?').join(',');
  return (
    db
      .prepare(
        `SELECT * FROM bookings WHERE trip_id IN (${marks}) ORDER BY created_at`,
      )
      .all(...tripIds) as Row[]
  ).map(toBooking);
}

export function bookingsForPassenger(passengerId: string): DemoBooking[] {
  return (
    db
      .prepare('SELECT * FROM bookings WHERE passenger_id = ? ORDER BY created_at')
      .all(passengerId) as Row[]
  ).map(toBooking);
}

export function getBooking(id: string): DemoBooking | undefined {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as
    | Row
    | undefined;
  return row ? toBooking(row) : undefined;
}

export function insertBooking(b: DemoBooking) {
  db.prepare(
    `INSERT INTO bookings (id, trip_id, passenger_id, passenger_name,
       passenger_rating, seats, status, total_usd, commission_usd,
       driver_amount_usd, paid, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    b.id,
    b.trip_id,
    b.passenger_id,
    b.passenger_name,
    b.passenger_rating,
    b.seats,
    b.status,
    b.total_usd,
    b.commission_usd,
    b.driver_amount_usd,
    b.paid ? 1 : 0,
    b.created_at,
  );
}

export function allBookings(): DemoBooking[] {
  return (
    db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all() as Row[]
  ).map(toBooking);
}

function setBookingStatus(id: string, status: BookingStatus) {
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
}

/**
 * El conductor acepta: la reserva pasa a confirmada y el puesto se
 * descuenta de la disponibilidad. Va en una transacción porque son dos
 * escrituras que deben pasar juntas o ninguna.
 */
export function confirmBooking(booking: DemoBooking) {
  db.exec('BEGIN');
  try {
    setBookingStatus(booking.id, 'confirmed');
    adjustSeats(booking.trip_id, -booking.seats);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function rejectBooking(booking: DemoBooking) {
  setBookingStatus(booking.id, 'rejected');
}

/**
 * Cancelación: si estaba confirmada, el puesto vuelve a quedar libre.
 */
export function cancelBooking(booking: DemoBooking) {
  db.exec('BEGIN');
  try {
    setBookingStatus(booking.id, 'cancelled');
    if (booking.status === 'confirmed') {
      adjustSeats(booking.trip_id, booking.seats);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Al cerrar el viaje, las confirmadas pasan a completadas. */
export function completeTripBookings(tripId: string): DemoBooking[] {
  const confirmed = bookingsForTrip(tripId).filter((b) => b.status === 'confirmed');
  db.exec('BEGIN');
  try {
    for (const b of confirmed) setBookingStatus(b.id, 'completed');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return confirmed.map((b) => ({ ...b, status: 'completed' as const }));
}

export function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** Puestos realmente libres: los del viaje menos los comprometidos. */
export function freeSeats(tripId: string): number {
  const trip = findTrip(tripId);
  if (!trip) return 0;
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(seats), 0) AS taken FROM bookings
       WHERE trip_id = ? AND status = 'pending'`,
    )
    .get(tripId) as { taken: number };
  return Math.max(trip.seats_available - row.taken, 0);
}

// ─── Calificaciones ────────────────────────────────────────────────

export function reviewsFor(targetName: string): DemoReview[] {
  return (
    db
      .prepare('SELECT * FROM reviews WHERE target_name = ? ORDER BY created_at')
      .all(targetName) as Row[]
  ).map(toReview);
}

export function reviewForBooking(
  bookingId: string,
  direction: DemoReview['direction'],
): DemoReview | undefined {
  const row = db
    .prepare('SELECT * FROM reviews WHERE booking_id = ? AND direction = ?')
    .get(bookingId, direction) as Row | undefined;
  return row ? toReview(row) : undefined;
}

export function insertReview(r: DemoReview) {
  db.prepare(
    `INSERT INTO reviews (id, booking_id, trip_id, direction, author_name,
       target_name, stars, comment, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(
    r.id,
    r.booking_id,
    r.trip_id,
    r.direction,
    r.author_name,
    r.target_name,
    r.stars,
    r.comment,
    r.created_at,
  );
}

export function allReviews(): DemoReview[] {
  return (
    db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as Row[]
  ).map(toReview);
}

/** Promedio de las calificaciones recibidas por una persona. */
export function ratingFor(targetName: string, fallback: number) {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS n, AVG(stars) AS avg FROM reviews WHERE target_name = ?',
    )
    .get(targetName) as { n: number; avg: number | null };
  if (!row.n) return { value: fallback, count: 0 };
  return { value: +(row.avg as number).toFixed(1), count: row.n };
}

// ─── Alta del conductor ────────────────────────────────────────────

export function kycFor(driverId: string): DriverKyc {
  const row = db.prepare('SELECT * FROM driver_kyc WHERE driver_id = ?').get(
    driverId,
  ) as Row | undefined;
  if (!row) return { driver_id: driverId, status: 'none', documents: [] };
  return {
    driver_id: row.driver_id as string,
    status: row.status as DriverKycStatus,
    documents: JSON.parse((row.documents as string) || '[]'),
    submitted_at: (row.submitted_at as string) || undefined,
    reviewed_at: (row.reviewed_at as string) || undefined,
  };
}

export function setKyc(driverId: string, kyc: DriverKyc) {
  db.prepare(
    `INSERT INTO driver_kyc (driver_id, status, documents, submitted_at, reviewed_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(driver_id) DO UPDATE SET
       status = excluded.status,
       documents = excluded.documents,
       submitted_at = excluded.submitted_at,
       reviewed_at = excluded.reviewed_at`,
  ).run(
    driverId,
    kyc.status,
    JSON.stringify(kyc.documents),
    kyc.submitted_at ?? null,
    kyc.reviewed_at ?? null,
  );
}

export function allKyc(): Record<string, DriverKyc> {
  const rows = db.prepare('SELECT driver_id FROM driver_kyc').all() as Row[];
  const out: Record<string, DriverKyc> = {};
  for (const r of rows) {
    const id = r.driver_id as string;
    out[id] = kycFor(id);
  }
  return out;
}

// ─── Política de cancelación ───────────────────────────────────────

/**
 * Reembolso según la política del documento maestro:
 *  - más de 2 horas antes de la salida → devuelve todo
 *  - menos de 2 horas → devuelve la mitad
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

export function departureDate(tripId: string): Date {
  const trip = findTrip(tripId);
  if (!trip) return new Date();
  return new Date(`${trip.departure_date}T${trip.departure_time}:00`);
}

// ─── Siembra inicial ───────────────────────────────────────────────

/**
 * Siembra el demo con historia la PRIMERA vez que corre.
 *
 * Ahora que hay persistencia, esto tiene que pasar una sola vez en la
 * vida de la base — si no, cada arranque duplicaría las reseñas. La
 * marca queda en la tabla `meta`.
 */
export function seedDemo() {
  if (IS_BUILD) return;
  if (getMeta('seeded') === '2') return;

  const past = [...TRIPS, ...MORE_TRIPS].find((t) => t.id === 't-zona-08');
  if (!past) return;

  const booking: DemoBooking = {
    id: 'b-seed-1',
    trip_id: past.id,
    passenger_id: 'p2000000-0000-0000-0000-000000000001',
    passenger_name: 'Carlos Ramírez',
    passenger_rating: 4.7,
    seats: 1,
    status: 'completed',
    total_usd: past.price_usd,
    commission_usd: +(past.price_usd * 0.15).toFixed(2),
    driver_amount_usd: +(past.price_usd * 0.85).toFixed(2),
    paid: true,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  };

  db.exec('BEGIN');
  try {
    if (!getBooking(booking.id)) insertBooking(booking);
    setTripStatus(past.id, 'completed');

    const seedReviews: DemoReview[] = [
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
    ];
    for (const r of seedReviews) {
      if (!reviewForBooking(r.booking_id, r.direction)) insertReview(r);
    }

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

    setMeta('seeded', '2');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

seedDemo();

// ─── Chat pasajero ↔ conductor ─────────────────────────────────────

/**
 * La conversación se ancla a la RESERVA, no al usuario.
 *
 * Es la decisión de diseño que importa: solo se puede escribir a
 * alguien con quien compartes un viaje concreto, y la conversación
 * muere con ese viaje. Sin eso, la app se convierte en un directorio
 * de teléfonos — que es exactamente el riesgo de seguridad que
 * hundió a varias plataformas de este tipo.
 */
export interface DemoMessage {
  id: string;
  booking_id: string;
  sender_role: 'passenger' | 'driver';
  sender_name: string;
  body: string;
  read_at?: string;
  created_at: string;
}

function toMessage(r: Row): DemoMessage {
  return {
    id: r.id as string,
    booking_id: r.booking_id as string,
    sender_role: r.sender_role as 'passenger' | 'driver',
    sender_name: r.sender_name as string,
    body: r.body as string,
    read_at: (r.read_at as string) || undefined,
    created_at: r.created_at as string,
  };
}

export function messagesForBooking(bookingId: string): DemoMessage[] {
  return (
    db
      .prepare('SELECT * FROM messages WHERE booking_id = ? ORDER BY created_at')
      .all(bookingId) as Row[]
  ).map(toMessage);
}

export function insertMessage(m: DemoMessage) {
  db.prepare(
    `INSERT INTO messages (id, booking_id, sender_role, sender_name, body, created_at)
     VALUES (?,?,?,?,?,?)`,
  ).run(m.id, m.booking_id, m.sender_role, m.sender_name, m.body, m.created_at);
}

/** Marca como leídos los mensajes que me escribió el otro lado. */
export function markRead(bookingId: string, myRole: 'passenger' | 'driver') {
  const other = myRole === 'passenger' ? 'driver' : 'passenger';
  db.prepare(
    `UPDATE messages SET read_at = ?
     WHERE booking_id = ? AND sender_role = ? AND read_at IS NULL`,
  ).run(new Date().toISOString(), bookingId, other);
}

/** Cuántos mensajes sin leer tengo en esta reserva. */
export function unreadCount(bookingId: string, myRole: 'passenger' | 'driver'): number {
  const other = myRole === 'passenger' ? 'driver' : 'passenger';
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE booking_id = ? AND sender_role = ? AND read_at IS NULL`,
    )
    .get(bookingId, other) as { n: number };
  return row.n;
}

/** Total de mensajes sin leer de un pasajero, para el contador del menú. */
export function unreadForPassenger(passengerId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages m
       JOIN bookings b ON b.id = m.booking_id
       WHERE b.passenger_id = ? AND m.sender_role = 'driver' AND m.read_at IS NULL`,
    )
    .get(passengerId) as { n: number };
  return row.n;
}

export function unreadForDriver(driverId: string): number {
  const tripIds = allTrips()
    .filter((t) => t.driver.id === driverId)
    .map((t) => t.id);
  if (tripIds.length === 0) return 0;
  const marks = tripIds.map(() => '?').join(',');
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages m
       JOIN bookings b ON b.id = m.booking_id
       WHERE b.trip_id IN (${marks}) AND m.sender_role = 'passenger'
         AND m.read_at IS NULL`,
    )
    .get(...tripIds) as { n: number };
  return row.n;
}

/** Última línea de la conversación, para la lista de chats. */
export function lastMessage(bookingId: string): DemoMessage | undefined {
  const r = db
    .prepare(
      'SELECT * FROM messages WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
    )
    .get(bookingId) as Row | undefined;
  return r ? toMessage(r) : undefined;
}

// ─── Pagos ─────────────────────────────────────────────────────────

/**
 * QA encontró que la reserva nacía con `paid: true` antes de que
 * existiera pago alguno — no existía el estado "reservado y sin
 * pagar", que es justo donde vive el riesgo de fraude.
 *
 * Ahora el pago es un hecho con su propio registro: la reserva está
 * pagada si y solo si hay una fila `succeeded` acá.
 */
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface DemoPayment {
  id: string;
  booking_id: string;
  amount_usd: number;
  method: string;
  status: PaymentStatus;
  reference: string;
  created_at: string;
}

export function paymentFor(bookingId: string): DemoPayment | undefined {
  const r = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(bookingId) as
    | Row
    | undefined;
  if (!r) return undefined;
  return {
    id: r.id as string,
    booking_id: r.booking_id as string,
    amount_usd: r.amount_usd as number,
    method: r.method as string,
    status: r.status as PaymentStatus,
    reference: r.reference as string,
    created_at: r.created_at as string,
  };
}

export function isPaid(bookingId: string): boolean {
  return paymentFor(bookingId)?.status === 'succeeded';
}

/**
 * Registra el pago y marca la reserva. Las dos escrituras van juntas
 * o ninguna: una reserva marcada pagada sin registro de pago es
 * precisamente el estado inconsistente que estamos eliminando.
 */
export function recordPayment(
  bookingId: string,
  amount: number,
  method: string,
  status: PaymentStatus,
  reference = '',
): DemoPayment {
  const payment: DemoPayment = {
    id: nextId('pay'),
    booking_id: bookingId,
    amount_usd: amount,
    method,
    status,
    reference,
    created_at: new Date().toISOString(),
  };

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO payments (id, booking_id, amount_usd, method, status, reference, created_at)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(booking_id) DO UPDATE SET
         status = excluded.status,
         method = excluded.method,
         reference = excluded.reference,
         created_at = excluded.created_at`,
    ).run(
      payment.id,
      payment.booking_id,
      payment.amount_usd,
      payment.method,
      payment.status,
      payment.reference,
      payment.created_at,
    );
    db.prepare('UPDATE bookings SET paid = ? WHERE id = ?').run(
      status === 'succeeded' ? 1 : 0,
      bookingId,
    );
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return payment;
}
