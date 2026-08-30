/**
 * Persistencia real en SQLite.
 *
 * Hasta ahora el estado vivía en memoria y se borraba al reiniciar el
 * servidor — el motivo principal de que el MVP se sintiera precario.
 * Esto lo resuelve sin agregar una sola dependencia: `node:sqlite` viene
 * incluido en Node 22, así que no hay paquete que instalar, no hay
 * servidor de base de datos que levantar y no hay costo de hosting.
 *
 * Por qué SQLite y no PostgreSQL todavía:
 *  · el esquema real (14 tablas con PostGIS) ya está escrito en
 *    api/src/database/migrations y es el destino final;
 *  · para el piloto, un archivo local aguanta de sobra y elimina la
 *    dependencia de un servicio externo pago;
 *  · las escrituras pasan todas por este módulo, así que migrar a
 *    Postgres es cambiar este archivo, no la aplicación.
 *
 * Los nombres de tabla y columna copian el esquema de la API a
 * propósito, para que la migración sea un COPY y no una traducción.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** El archivo vive fuera de .next para que un rebuild no lo borre. */
const DB_PATH = process.env.PUESTICO_DB || join(process.cwd(), 'data', 'puestico.db');

/**
 * Durante `next build` no hay que escribir nada: los workers de
 * compilación importan los módulos para analizarlos, y si además
 * siembran datos se pelean por el candado del archivo.
 */
export const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build';

function connect(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  // WAL: permite lecturas concurrentes mientras se escribe.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  // Sin esto, un fallo a mitad de escritura puede dejar la base a medias.
  db.exec('PRAGMA synchronous = NORMAL');
  // Durante el build, Next levanta varios procesos que abren la base a la
  // vez. Sin espera, el segundo falla con "database is locked".
  db.exec('PRAGMA busy_timeout = 5000');

  migrate(db);
  return db;
}

/**
 * Crea el esquema si no existe. Idempotente: se puede correr en cada
 * arranque sin efecto si ya está.
 */
function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id                TEXT PRIMARY KEY,
      trip_id           TEXT NOT NULL,
      passenger_id      TEXT NOT NULL,
      passenger_name    TEXT NOT NULL,
      passenger_rating  REAL NOT NULL DEFAULT 5,
      seats             INTEGER NOT NULL CHECK (seats > 0),
      status            TEXT NOT NULL,
      total_usd         REAL NOT NULL,
      commission_usd    REAL NOT NULL,
      driver_amount_usd REAL NOT NULL,
      paid              INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

    CREATE TABLE IF NOT EXISTS trip_status (
      trip_id TEXT PRIMARY KEY,
      status  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id             TEXT PRIMARY KEY,
      driver_id      TEXT NOT NULL,
      plate          TEXT NOT NULL,
      model          TEXT NOT NULL,
      year           INTEGER NOT NULL,
      color          TEXT NOT NULL,
      origin         TEXT NOT NULL,
      destination    TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      seats_total    INTEGER NOT NULL,
      seats_available INTEGER NOT NULL,
      price_usd      REAL NOT NULL,
      created_at     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trips_route
      ON trips(origin, destination, departure_date);

    CREATE TABLE IF NOT EXISTS reviews (
      id          TEXT PRIMARY KEY,
      booking_id  TEXT NOT NULL,
      trip_id     TEXT NOT NULL,
      direction   TEXT NOT NULL,
      author_name TEXT NOT NULL,
      target_name TEXT NOT NULL,
      stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      comment     TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      UNIQUE (booking_id, direction)
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_name);

    CREATE TABLE IF NOT EXISTS driver_kyc (
      driver_id    TEXT PRIMARY KEY,
      status       TEXT NOT NULL,
      documents    TEXT NOT NULL DEFAULT '[]',
      submitted_at TEXT,
      reviewed_at  TEXT
    );

    /* Ajustes de puestos hechos sobre los viajes semilla (que viven en
       código, no en la base). Guardamos el delta para poder reconstruir
       la disponibilidad tras un reinicio. */
    CREATE TABLE IF NOT EXISTS seat_adjustments (
      trip_id TEXT PRIMARY KEY,
      delta   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/**
 * Una sola conexión por proceso, guardada en globalThis para que
 * sobreviva al hot-reload de Next en desarrollo (si no, cada recarga
 * abriría un descriptor nuevo y se agotarían).
 */
const g = globalThis as unknown as { __puesticoDb?: DatabaseSync };

export const db: DatabaseSync = g.__puesticoDb || (g.__puesticoDb = connect());

/** Marca de una sola vez, para no re-sembrar en cada arranque. */
export function getMeta(key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}
