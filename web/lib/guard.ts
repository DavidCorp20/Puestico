/**
 * Control de acceso por rol.
 *
 * Hasta ahora pasajero y conductor veían la misma app y las mismas
 * pantallas. Esto lo separa, y la parte importante es DÓNDE se separa:
 *
 * **Esconder botones no es control de acceso.** Si la única diferencia
 * entre un pasajero y un conductor es qué enlaces se dibujan, el
 * pasajero entra igual escribiendo la dirección a mano. Por eso cada
 * pantalla protegida llama a uno de estos guardias, que resuelven la
 * sesión del lado servidor y redirigen antes de renderizar nada.
 *
 * Las tres reglas:
 *  · sin sesión            → a entrar, recordando a dónde iba
 *  · sesión sin nombre     → a terminar el registro
 *  · rol equivocado        → a su propio inicio, no a un error
 *
 * Lo último es una decisión de producto: mandar a un pasajero a "no
 * tienes permiso" cuando toca por error algo de conductor es hostil y
 * no le enseña nada. Se lo devolvemos a su casa.
 */

import { redirect } from 'next/navigation';
import { currentUser } from './session';
import type { User } from './auth';
import { homeFor } from './roles';

// Se re-exporta para que quien ya importa homeFor desde acá siga
// funcionando; la definición vive en lib/roles.ts, sin dependencias de
// Next, para poder probarla.
export { homeFor };

/**
 * Exige sesión con registro terminado. No mira el rol.
 * Para pantallas que sirven a los dos (cuenta, chat, verificación).
 */
export async function requireUser(next: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  if (!user.name) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Exige que sea un PASAJERO. Un conductor que caiga acá se va a su
 * panel: no es un error suyo, es que esa pantalla no es para él.
 */
export async function requirePassenger(next: string): Promise<User> {
  const user = await requireUser(next);
  if (user.role !== 'passenger') redirect('/conductor');
  return user;
}

/** Exige que sea un CONDUCTOR. Simétrico al anterior. */
export async function requireDriver(next: string): Promise<User> {
  const user = await requireUser(next);
  if (user.role !== 'driver') redirect('/buscar');
  return user;
}

/**
 * Para las rutas de la API: no redirige, devuelve el motivo para que
 * quien llama responda con el código correcto. Una API que redirige
 * confunde al cliente que espera JSON.
 */
export type ApiAuth =
  | { ok: true; user: User }
  | { ok: false; status: number; error: string; code: string };

export async function apiUser(role?: 'passenger' | 'driver'): Promise<ApiAuth> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'Inicia sesión para continuar.',
      code: 'AUTH_REQUIRED',
    };
  }
  if (!user.name) {
    return {
      ok: false,
      status: 403,
      error: 'Completa tu registro para continuar.',
      code: 'PROFILE_INCOMPLETE',
    };
  }
  if (role && user.role !== role) {
    return {
      ok: false,
      status: 403,
      error:
        role === 'driver'
          ? 'Esta acción es solo para conductores.'
          : 'Esta acción es solo para pasajeros.',
      code: 'WRONG_ROLE',
    };
  }
  return { ok: true, user };
}
