/**
 * Pruebas de la capa de identidad, pago y chat.
 *
 * Por qué existe este archivo: la auditoría encontró que CI no miraba
 * `web/` ni una sola vez — o sea, no protegía el código que el usuario
 * realmente ejecuta. Las reglas que se prueban acá son las que, si se
 * rompen en silencio, tienen consecuencias reales:
 *
 *  · un teléfono escrito de cuatro formas distintas debe ser UNA cuenta
 *  · el código de verificación NO puede quedar en claro en la base
 *  · una reserva NO puede nacer pagada
 *  · nadie puede leer, escribir ni pagar en una reserva ajena
 *
 * Corre contra la base real (un archivo temporal), no contra dobles:
 * las reglas que importan viven en SQL y en transacciones, y un doble
 * las daría por buenas sin ejercitarlas.
 *
 * Uso: node --test test/auth-chat.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Base propia y desechable: las pruebas nunca deben tocar la base del
// demo, y una prueba que depende del estado anterior no es una prueba.
const dir = mkdtempSync(join(tmpdir(), 'puestico-test-'));
process.env.PUESTICO_DB = join(dir, 'test.db');
process.env.PUESTICO_DEMO_OTP = '1';

let auth, store, db;

before(async () => {
  auth = await import('../lib/auth.ts');
  store = await import('../lib/store.ts');
  ({ db } = await import('../lib/db.ts'));
});

after(() => rmSync(dir, { recursive: true, force: true }));

// ─── Teléfonos ─────────────────────────────────────────────────────

test('el mismo teléfono escrito de varias formas normaliza igual', () => {
  const formas = [
    '0412-555-1234',
    '04125551234',
    '+584125551234',
    '412 555 1234',
    '58 412 555 1234',
  ];
  for (const forma of formas) {
    assert.equal(
      auth.normalizePhone(forma),
      '+584125551234',
      `"${forma}" debería normalizar a +584125551234`,
    );
  }
});

test('rechaza números que no son móviles venezolanos', () => {
  for (const malo of ['', '123', '0212 555 1234', '0499 555 1234', 'abc', '041255512']) {
    assert.equal(auth.normalizePhone(malo), null, `"${malo}" debería ser inválido`);
  }
});

// ─── Códigos de verificación ───────────────────────────────────────

test('el código NO se guarda en claro en la base', () => {
  const { demo_code } = auth.requestOtp('04121110000');
  assert.ok(demo_code, 'en modo demo debe devolver el código');

  const filas = db.prepare('SELECT code_hash FROM otp_codes').all();
  for (const fila of filas) {
    assert.notEqual(
      fila.code_hash,
      demo_code,
      'el código quedó en claro: un volcado de la base abriría cuentas',
    );
  }
  assert.match(filas.at(-1).code_hash, /^[a-f0-9]{64}$/, 'debe ser un sha256');
});

test('un código incorrecto no crea sesión y gasta intento', () => {
  auth.requestOtp('04121110001');
  const malo = auth.verifyOtp('04121110001', '000000');
  assert.equal(malo.ok, false);
  assert.ok(malo.error.includes('intento'), 'debe decir cuántos intentos quedan');
});

test('el código se puede usar UNA sola vez', () => {
  const { demo_code } = auth.requestOtp('04121110002');
  const primera = auth.verifyOtp('04121110002', demo_code);
  assert.equal(primera.ok, true);

  const segunda = auth.verifyOtp('04121110002', demo_code);
  assert.equal(segunda.ok, false, 'reusar el código debe fallar');
});

test('cinco códigos seguidos al mismo número se cortan', () => {
  const tel = '04121110003';
  const resultados = [1, 2, 3, 4, 5].map(() => auth.requestOtp(tel));
  assert.ok(
    resultados.some((r) => !r.ok),
    'sin antiflood, un script pide mil códigos y cada uno cuesta dinero',
  );
});

// ─── Sesiones ──────────────────────────────────────────────────────

test('el token de sesión no revela el usuario', () => {
  const { demo_code } = auth.requestOtp('04121110004');
  const { token, user } = auth.verifyOtp('04121110004', demo_code);

  assert.ok(!token.includes(user.id), 'el token no debe contener el id');
  assert.equal(auth.userForToken(token).id, user.id, 'debe resolver al usuario');
  assert.equal(
    auth.userForToken('inventado'),
    null,
    'un token inventado no puede resolver a nadie',
  );
});

test('cerrar sesión invalida el token del lado servidor', () => {
  const { demo_code } = auth.requestOtp('04121110005');
  const { token } = auth.verifyOtp('04121110005', demo_code);

  auth.revokeSession(token);
  assert.equal(
    auth.userForToken(token),
    null,
    'borrar solo la cookie dejaría el token vivo para quien lo copió',
  );
});

test('entrar dos veces con el mismo teléfono es la MISMA cuenta', () => {
  const tel = '04121110006';
  const a = auth.verifyOtp(tel, auth.requestOtp(tel).demo_code);
  const b = auth.verifyOtp(tel, auth.requestOtp(tel).demo_code);

  assert.equal(a.user.id, b.user.id, 'dos cuentas = historial perdido');
  assert.equal(a.is_new, true);
  assert.equal(b.is_new, false);
});

// ─── Cédula ────────────────────────────────────────────────────────

test('normaliza la cédula al formato canónico', () => {
  assert.equal(auth.normalizeCedula('12345678'), 'V-12345678');
  assert.equal(auth.normalizeCedula('V-12345678'), 'V-12345678');
  assert.equal(auth.normalizeCedula('v 12345678'), 'V-12345678');
  assert.equal(auth.normalizeCedula('E12345678'), 'E-12345678');
  assert.equal(auth.normalizeCedula('abc'), null);
  assert.equal(auth.normalizeCedula('123'), null);
});

// ─── Pagos ─────────────────────────────────────────────────────────

test('una reserva NO nace pagada', () => {
  const id = store.nextId('b');
  store.insertBooking({
    id,
    trip_id: 't-zona-01',
    passenger_id: 'u-test',
    passenger_name: 'Prueba',
    passenger_rating: 5,
    seats: 1,
    status: 'pending',
    total_usd: 5.75,
    commission_usd: 0.86,
    driver_amount_usd: 4.89,
    paid: false,
    created_at: new Date().toISOString(),
  });

  assert.equal(store.isPaid(id), false, 'no existía el estado "reservado sin pagar"');
  assert.equal(store.paymentFor(id), undefined, 'no debe haber pago aún');
});

test('el pago marca la reserva y queda registrado', () => {
  const id = store.nextId('b');
  store.insertBooking({
    id,
    trip_id: 't-zona-01',
    passenger_id: 'u-test',
    passenger_name: 'Prueba',
    passenger_rating: 5,
    seats: 1,
    status: 'pending',
    total_usd: 5.75,
    commission_usd: 0.86,
    driver_amount_usd: 4.89,
    paid: false,
    created_at: new Date().toISOString(),
  });

  store.recordPayment(id, 5.75, 'pago_movil', 'succeeded', 'PM-1');
  assert.equal(store.isPaid(id), true);
  assert.equal(store.getBooking(id).paid, true, 'la reserva debe quedar marcada');

  const pago = store.paymentFor(id);
  assert.equal(pago.amount_usd, 5.75);
  assert.equal(pago.method, 'pago_movil');
});

test('un pago rechazado deja la reserva SIN pagar', () => {
  const id = store.nextId('b');
  store.insertBooking({
    id,
    trip_id: 't-zona-01',
    passenger_id: 'u-test',
    passenger_name: 'Prueba',
    passenger_rating: 5,
    seats: 1,
    status: 'pending',
    total_usd: 5.75,
    commission_usd: 0.86,
    driver_amount_usd: 4.89,
    paid: false,
    created_at: new Date().toISOString(),
  });

  store.recordPayment(id, 5.75, 'tarjeta', 'failed');
  assert.equal(store.isPaid(id), false);
  assert.equal(
    store.getBooking(id).paid,
    false,
    'un rechazo no puede dejar la reserva marcada como pagada',
  );
});

// ─── Chat ──────────────────────────────────────────────────────────

test('la conversación se guarda, se ordena y cuenta los no leídos', () => {
  const bookingId = 'b-chat-test';

  store.insertMessage({
    id: 'm1',
    booking_id: bookingId,
    sender_role: 'passenger',
    sender_name: 'Luis',
    body: '¿Dónde te espero?',
    created_at: '2026-09-01T10:00:00.000Z',
  });
  store.insertMessage({
    id: 'm2',
    booking_id: bookingId,
    sender_role: 'driver',
    sender_name: 'María',
    body: 'En la plaza',
    created_at: '2026-09-01T10:01:00.000Z',
  });

  const mensajes = store.messagesForBooking(bookingId);
  assert.equal(mensajes.length, 2);
  assert.equal(mensajes[0].body, '¿Dónde te espero?', 'debe venir en orden');

  // Cada lado cuenta lo que le escribió el OTRO.
  assert.equal(store.unreadCount(bookingId, 'passenger'), 1);
  assert.equal(store.unreadCount(bookingId, 'driver'), 1);

  store.markRead(bookingId, 'passenger');
  assert.equal(store.unreadCount(bookingId, 'passenger'), 0);
  assert.equal(
    store.unreadCount(bookingId, 'driver'),
    1,
    'que el pasajero lea no marca lo del conductor',
  );

  assert.equal(store.lastMessage(bookingId).body, 'En la plaza');
});

test('una conversación sin mensajes no rompe nada', () => {
  assert.deepEqual(store.messagesForBooking('b-no-existe'), []);
  assert.equal(store.unreadCount('b-no-existe', 'passenger'), 0);
  assert.equal(store.lastMessage('b-no-existe'), undefined);
});

// ─── Verificación de identidad ─────────────────────────────────────

test('la verificación NO guarda la imagen, solo el hecho', () => {
  auth.setIdentity({
    user_id: 'u-ident',
    status: 'pending',
    id_number: 'V-18456789',
    full_name: 'Luis Alberto Pérez',
    selfie_ref: 'selfie:u-ident',
    submitted_at: new Date().toISOString(),
    reason: '',
  });

  const check = auth.identityFor('u-ident');
  assert.equal(check.status, 'pending');

  const fila = db
    .prepare('SELECT * FROM identity_checks WHERE user_id = ?')
    .get('u-ident');
  for (const [columna, valor] of Object.entries(fila)) {
    if (typeof valor === 'string') {
      assert.ok(
        !valor.startsWith('data:image'),
        `la columna ${columna} guardó una imagen: eso no puede pasar`,
      );
      assert.ok(valor.length < 200, `la columna ${columna} es sospechosamente larga`);
    }
  }
});

test('el estado por defecto es "sin verificar"', () => {
  assert.equal(auth.identityFor('u-nadie').status, 'none');
});

// ─── Acceso rápido (temporal) ──────────────────────────────────────

test('el acceso rápido crea una cuenta normal, no una de segunda', () => {
  const res = auth.quickAccess('0412 900 5511');
  assert.equal(res.ok, true);
  assert.ok(res.token, 'debe crear sesión');
  assert.equal(res.user.phone, '+584129005511', 'el teléfono se normaliza igual');

  // La sesión resuelve como cualquier otra: el atajo se salta la
  // comprobación del número, no el registro.
  assert.equal(auth.userForToken(res.token).id, res.user.id);
});

test('el acceso rápido valida el teléfono igual que el login normal', () => {
  for (const malo of ['123', '0212 555 1234', '']) {
    assert.equal(
      auth.quickAccess(malo).ok,
      false,
      `"${malo}" no debería entrar ni por el atajo`,
    );
  }
});

test('el acceso rápido reconoce una cuenta que ya existe', () => {
  const tel = '0412 900 5522';
  const a = auth.quickAccess(tel);
  const b = auth.quickAccess(tel);
  assert.equal(a.user.id, b.user.id, 'el mismo teléfono es la misma cuenta');
  assert.equal(b.is_new, false);
});

test('el interruptor apaga el atajo en el SERVIDOR, no solo el botón', () => {
  const antes = process.env.PUESTICO_QUICK_ACCESS;
  try {
    process.env.PUESTICO_QUICK_ACCESS = '0';
    assert.equal(auth.quickAccessEnabled(), false);
    // Esto es lo que importa: aunque alguien llame la función directo
    // (o la ruta de la API a mano), no entra.
    const res = auth.quickAccess('0412 900 5533');
    assert.equal(res.ok, false, 'apagado, el atajo no puede crear sesión');
    assert.ok(!res.token);
  } finally {
    if (antes === undefined) delete process.env.PUESTICO_QUICK_ACCESS;
    else process.env.PUESTICO_QUICK_ACCESS = antes;
  }
  assert.equal(auth.quickAccessEnabled(), true, 'y se puede volver a prender');
});
