/**
 * Reglas de rol que no dependen de Next.
 *
 * Vive aparte de lib/guard.ts por la misma razón que lib/session.ts
 * vive aparte de lib/auth.ts: guard.ts importa `next/navigation` para
 * poder redirigir, y eso hace imposible probarlo con `node --test`.
 * Las reglas puras van acá y se prueban; los guardias que redirigen
 * quedan allá y se ejercitan recorriendo la aplicación.
 */

export type Role = 'passenger' | 'driver';

/**
 * A dónde le corresponde ir a cada rol al abrir la app.
 *
 * Es la pieza central de la separación que pidió David: pasajero y
 * conductor no comparten pantalla de inicio, así que todo lo que
 * necesite "mandar al usuario a su casa" pasa por acá y no por un
 * literal repetido en diez archivos.
 */
export function homeFor(user: { role: Role }): string {
  return user.role === 'driver' ? '/conductor' : '/buscar';
}
