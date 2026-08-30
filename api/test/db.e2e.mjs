/**
 * Pruebas de la base de datos DE VERDAD.
 *
 * Estas no usan simulaciones: abren PostgreSQL con PostGIS, cargan el
 * esquema y la semilla, y comprueban las reglas que solo la base puede
 * garantizar. Es donde apareció el error del bloqueo de puestos que
 * ninguna prueba unitaria podía ver.
 *
 * Se corren con:  npm run test:db     (necesita DATABASE_URL)
 * Si no hay DATABASE_URL, se saltan en vez de fallar — así el CI de la
 * app web no se rompe por esto.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const URL = process.env.DATABASE_URL;

if (!URL) {
  console.log('DATABASE_URL sin definir — se saltan las pruebas de base.');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: URL });

const TRIP_ACTIVE = 'f3000000-0000-0000-0000-000000000004';
const TRIP_FUTURE = 'f3000000-0000-0000-0000-000000000001';
const PASS_1 = 'e2000000-0000-0000-0000-000000000001';
const PASS_2 = 'e2000000-0000-0000-0000-000000000002';
const PASS_4 = 'e2000000-0000-0000-0000-000000000004';

async function reseed() {
  await pool.query(readFileSync('src/database/seeds/001_seed_data.sql', 'utf8'));
}

before(async () => {
  for (const m of [
    'src/database/migrations/002_fix_booking_seat_lock.sql',
    'src/database/migrations/003_signup_only_needs_phone.sql',
  ]) {
    await pool.query(readFileSync(m, 'utf8'));
  }
  await reseed();
});

after(async () => {
  await pool.end();
});

describe('esquema y semilla', () => {
  test('PostGIS está activo', async () => {
    const { rows } = await pool.query('SELECT postgis_version() AS v');
    assert.match(rows[0].v, /^3\./);
  });

  test('la semilla carga entera y es repetible', async () => {
    await reseed();
    await reseed(); // dos veces seguidas: antes fallaba con duplicate key
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM users)    AS users,
              (SELECT count(*) FROM trips)    AS trips,
              (SELECT count(*) FROM bookings) AS bookings,
              (SELECT count(*) FROM payments) AS payments`,
    );
    assert.equal(Number(rows[0].users), 10);
    assert.equal(Number(rows[0].trips), 5);
    assert.equal(Number(rows[0].bookings), 5);
    assert.equal(Number(rows[0].payments), 4);
  });

  test('cada reserva pagada quedó enlazada con su pago', async () => {
    const { rows } = await pool.query(
      `SELECT count(*) AS n FROM bookings b
        JOIN payments p ON p.booking_id = b.id
       WHERE b.payment_id IS DISTINCT FROM p.id`,
    );
    assert.equal(Number(rows[0].n), 0);
  });
});

describe('puestos: el error que traía el esquema', () => {
  test('DOS pasajeros distintos pueden reservar el mismo viaje', async () => {
    await reseed();
    // Con el índice viejo (trip_id, seats) esto fallaba: el segundo
    // pasajero era rechazado por la base de datos.
    const { rows } = await pool.query(
      `SELECT count(*) AS n FROM bookings
        WHERE trip_id = $1 AND status = 'confirmed'`,
      [TRIP_ACTIVE],
    );
    assert.equal(Number(rows[0].n), 2);
  });

  test('el mismo pasajero NO puede reservar dos veces el mismo viaje', async () => {
    await reseed();
    await assert.rejects(
      pool.query(
        `INSERT INTO bookings (trip_id, passenger_id, seats, status)
         VALUES ($1, $2, 1, 'confirmed')`,
        [TRIP_ACTIVE, PASS_1],
      ),
      /idx_booking_one_per_passenger|duplicate key/,
    );
  });

  test('no se puede sobrevender un viaje', async () => {
    await reseed();
    const { rows: t } = await pool.query(
      `SELECT seats_total, seats_available FROM trips WHERE id = $1`,
      [TRIP_ACTIVE],
    );
    const free = Number(t[0].seats_available);
    await assert.rejects(
      pool.query(
        `INSERT INTO bookings (trip_id, passenger_id, seats, status)
         VALUES ($1, $2, $3, 'confirmed')`,
        [TRIP_ACTIVE, PASS_4, free + 1],
      ),
      /Sin puestos/,
    );
  });

  test('seats_available se deriva de las reservas, no se lleva a mano', async () => {
    await reseed();
    const { rows } = await pool.query(
      `SELECT t.seats_total, t.seats_available,
              COALESCE(SUM(b.seats) FILTER (
                WHERE b.status IN ('pending','confirmed')), 0) AS taken
         FROM trips t
         LEFT JOIN bookings b ON b.trip_id = t.id
        WHERE t.id = $1
        GROUP BY t.id, t.seats_total, t.seats_available`,
      [TRIP_ACTIVE],
    );
    const r = rows[0];
    assert.equal(
      Number(r.seats_available),
      Number(r.seats_total) - Number(r.taken),
    );
  });

  test('cancelar una reserva devuelve el puesto a la calle', async () => {
    await reseed();
    const before = await pool.query(
      `SELECT seats_available FROM trips WHERE id = $1`,
      [TRIP_ACTIVE],
    );
    await pool.query(
      `UPDATE bookings SET status = 'cancelled'
        WHERE trip_id = $1 AND passenger_id = $2`,
      [TRIP_ACTIVE, PASS_1],
    );
    const after = await pool.query(
      `SELECT seats_available FROM trips WHERE id = $1`,
      [TRIP_ACTIVE],
    );
    assert.equal(
      Number(after.rows[0].seats_available),
      Number(before.rows[0].seats_available) + 1,
    );
  });

  test('dos reservas SIMULTÁNEAS del último puesto: solo una entra', async () => {
    await reseed();
    // Se deja el viaje futuro con exactamente 1 puesto libre.
    await pool.query(
      `UPDATE trips SET seats_total = 2 WHERE id = $1`,
      [TRIP_FUTURE],
    );
    await pool.query(
      `UPDATE bookings SET seats = seats WHERE trip_id = $1`,
      [TRIP_FUTURE],
    ); // dispara el recálculo

    const a = await pool.connect();
    const b = await pool.connect();
    try {
      await a.query('BEGIN');
      await b.query('BEGIN');

      const insert = (c, passenger) =>
        c.query(
          `INSERT INTO bookings (trip_id, passenger_id, seats, status)
           VALUES ($1, $2, 1, 'confirmed')`,
          [TRIP_FUTURE, passenger],
        );

      await insert(a, PASS_2);
      // La segunda espera el bloqueo de fila del viaje, y al liberarse
      // ya ve que no queda puesto.
      const second = insert(b, PASS_4);
      await a.query('COMMIT');

      await assert.rejects(second, /Sin puestos/);
      await b.query('ROLLBACK');
    } finally {
      a.release();
      b.release();
    }
  });
});

describe('búsqueda geográfica', () => {
  test('ST_DWithin encuentra viajes cerca de un punto', async () => {
    await reseed();
    // Punto en Guatire; los viajes de la semilla salen de allí.
    const { rows } = await pool.query(
      `SELECT id, origin,
              ROUND((ST_Distance(origin_coords,
                ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)/1000)::numeric,1)
                AS km
         FROM trips
        WHERE ST_DWithin(origin_coords,
                ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
        ORDER BY km ASC`,
      [-66.5389, 10.4728, 20000],
    );
    assert.ok(rows.length > 0, 'debería encontrar viajes cerca de Guatire');
    assert.ok(Number(rows[0].km) <= 20);
  });

  test('un radio chico en otro estado no devuelve nada', async () => {
    const { rows } = await pool.query(
      `SELECT id FROM trips
        WHERE ST_DWithin(origin_coords,
                ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, 5000)`,
      [-71.6, 10.6], // Maracaibo
    );
    assert.equal(rows.length, 0);
  });

  test('las coordenadas de la semilla caen dentro de Venezuela', async () => {
    const { rows } = await pool.query(
      `SELECT count(*) AS fuera FROM trips
        WHERE origin_coords IS NOT NULL
          AND NOT (ST_X(origin_coords::geometry) BETWEEN -74 AND -59
               AND ST_Y(origin_coords::geometry) BETWEEN 0 AND 13)`,
    );
    assert.equal(Number(rows[0].fuera), 0);
  });
});

describe('reglas de estado', () => {
  test('un viaje completado no admite reservas', async () => {
    await reseed();
    const { rows } = await pool.query(
      `SELECT id FROM trips WHERE status = 'completed' LIMIT 1`,
    );
    await assert.rejects(
      pool.query(
        `INSERT INTO bookings (trip_id, passenger_id, seats, status)
         VALUES ($1, $2, 1, 'confirmed')`,
        [rows[0].id, PASS_4],
      ),
      /ya está completed/,
    );
  });

  test('el teléfono es único: no hay cuentas duplicadas', async () => {
    await assert.rejects(
      pool.query(
        `INSERT INTO users (name, phone, role, status)
         VALUES ('Duplicado', '+584121000001', 'passenger', 'active')`,
      ),
      /duplicate key/,
    );
  });

  test('se puede crear una cuenta SOLO con el teléfono', async () => {
    // Esto era imposible con el esquema de 001 (name e id_doc NOT NULL),
    // siendo que el registro real es "teléfono + código". Ver 003.
    const { rows } = await pool.query(
      `INSERT INTO users (phone, role, status)
       VALUES ('+584129998877', 'passenger', 'active')
       RETURNING id, name, id_doc`,
    );
    assert.equal(rows[0].name, null);
    assert.equal(rows[0].id_doc, null);
    await pool.query('DELETE FROM users WHERE id = $1', [rows[0].id]);
  });

  test('un teléfono sin normalizar es rechazado por la base', async () => {
    // 0412... y +58412... son la MISMA persona; si la base acepta las dos
    // formas, el mismo usuario termina con dos cuentas.
    await assert.rejects(
      pool.query(
        `INSERT INTO users (phone, role, status)
         VALUES ('04129998877', 'passenger', 'active')`,
      ),
      /chk_users_phone_e164/,
    );
  });

  test('un conductor no se puede marcar verificado sin cédula', async () => {
    const { rows: u } = await pool.query(
      `INSERT INTO users (phone, role, status)
       VALUES ('+584129990001', 'driver', 'active') RETURNING id`,
    );
    await assert.rejects(
      pool.query(
        `INSERT INTO driver_profiles (user_id, verified, verification_status)
         VALUES ($1, TRUE, 'approved')`,
        [u[0].id],
      ),
      /nombre y cédula/,
    );
    await pool.query('DELETE FROM users WHERE id = $1', [u[0].id]);
  });

  test('la comisión guardada es del 15% y cuadra con el neto', async () => {
    await reseed();
    const { rows } = await pool.query(
      `SELECT count(*) AS malos FROM payments
        WHERE ROUND(amount_usd * 0.15, 2) <> commission_usd
           OR ROUND(amount_usd - commission_usd, 2) <> driver_amount_usd`,
    );
    assert.equal(Number(rows[0].malos), 0);
  });
});
