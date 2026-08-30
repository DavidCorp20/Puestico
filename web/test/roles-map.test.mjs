/**
 * Pruebas de los roles y del mapa real.
 *
 * Las reglas que se prueban acá son las que David pidió y las que, si
 * se rompen, dejan a un rol viendo lo del otro:
 *  · cada rol tiene su propia pantalla de inicio
 *  · la geometría de las carreteras existe y es coherente
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'puestico-roles-'));
process.env.PUESTICO_DB = join(dir, 'test.db');
process.env.PUESTICO_DEMO_OTP = '1';

let guard, auth, route;

before(async () => {
  // lib/roles.ts tiene las reglas puras; lib/guard.ts importa
  // next/navigation para redirigir y no se puede cargar fuera de Next.
  // Los guardias con redirect se ejercitan recorriendo la aplicación.
  guard = await import('../lib/roles.ts');
  auth = await import('../lib/auth.ts');
  route = await import('../lib/route.ts');
});

after(() => rmSync(dir, { recursive: true, force: true }));

// ─── Roles ─────────────────────────────────────────────────────────

test('cada rol tiene su propia pantalla de inicio', () => {
  assert.equal(guard.homeFor({ role: 'passenger' }), '/buscar');
  assert.equal(guard.homeFor({ role: 'driver' }), '/conductor');
});

test('una cuenta nueva nace como pasajero', () => {
  const tel = '04125550001';
  const { user } = auth.verifyOtp(tel, auth.requestOtp(tel).demo_code);
  assert.equal(user.role, 'passenger', 'el rol por defecto es el menos privilegiado');
  assert.equal(user.driver_ref, undefined);
});

test('cambiar a conductor NO crea otra cuenta', () => {
  const tel = '04125550002';
  const { user } = auth.verifyOtp(tel, auth.requestOtp(tel).demo_code);

  auth.updateUser(user.id, { name: 'Ana Rivas', role: 'driver', driver_ref: 'd-1' });
  const after = auth.userById(user.id);

  assert.equal(after.id, user.id, 'debe ser la MISMA cuenta');
  assert.equal(after.phone, user.phone, 'el mismo teléfono');
  assert.equal(after.role, 'driver');
  assert.equal(guard.homeFor(after), '/conductor');
});

test('driverIdFor solo devuelve algo si la cuenta conduce', () => {
  const pasajero = { id: 'u-1', role: 'passenger', driver_ref: 'd-9' };
  const conductor = { id: 'u-2', role: 'driver', driver_ref: 'd-9' };
  const sinPerfil = { id: 'u-3', role: 'driver' };

  assert.equal(auth.driverIdFor(pasajero), null, 'un pasajero no conduce');
  assert.equal(auth.driverIdFor(conductor), 'd-9');
  assert.equal(auth.driverIdFor(sinPerfil), 'u-3', 'sin perfil, su propio id');
});

// ─── Mapa ──────────────────────────────────────────────────────────

test('las rutas del corredor tienen carretera real', () => {
  const pares = [
    ['Guatire', 'Chacaíto'],
    ['Guatire', 'Chacao'],
    ['Los Teques', 'Centro de Caracas'],
    ['Petare', 'Catia'],
    ['La Guaira', 'Centro de Caracas'],
  ];

  for (const [from, to] of pares) {
    const road = route.roadLine(from, to);
    assert.ok(road, `falta la geometría de ${from} → ${to}`);
    assert.ok(road.line.length > 10, 'una carretera real tiene curvas, no 2 puntos');
    assert.ok(road.km > 1 && road.km < 120, `km fuera de rango: ${road.km}`);
    assert.ok(road.minutes > 1 && road.minutes < 180);
  }
});

test('la geometría sirve en los dos sentidos', () => {
  const ida = route.roadLine('Petare', 'Catia');
  const vuelta = route.roadLine('Catia', 'Petare');

  assert.ok(vuelta, 'el sentido contrario debe resolverse invirtiendo');
  assert.equal(ida.line.length, vuelta.line.length);
  // El primer punto de la vuelta es el último de la ida.
  assert.deepEqual(vuelta.line[0], ida.line[ida.line.length - 1]);
});

test('las coordenadas caen dentro de Venezuela', () => {
  const road = route.roadLine('Guatire', 'Chacaíto');
  for (const [lng, lat] of road.line) {
    assert.ok(lng > -68 && lng < -65, `longitud fuera del área: ${lng}`);
    assert.ok(lat > 10 && lat < 11, `latitud fuera del área: ${lat}`);
  }
});

test('un par sin descargar devuelve null, no explota', () => {
  assert.equal(route.roadLine('Guatire', 'Zona Inventada'), null);
  assert.equal(route.roadLine('', ''), null);
});

test('la carretera real es más larga que la línea recta', () => {
  // Cordura: si la geometría fuera una recta, el mapa estaría mintiendo.
  const road = route.roadLine('Guatire', 'Chacaíto');
  const a = road.line[0];
  const b = road.line[road.line.length - 1];
  // ~111 km por grado; suficiente para una comparación de orden.
  const recta = Math.hypot((b[0] - a[0]) * 111, (b[1] - a[1]) * 111);

  assert.ok(
    road.km > recta,
    `la carretera (${road.km} km) debería ser más larga que la recta (${recta.toFixed(1)} km)`,
  );
});
