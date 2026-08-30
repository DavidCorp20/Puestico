/**
 * El usuario de la petición actual.
 *
 * Vive aparte de lib/auth.ts a propósito: esto necesita `next/headers`,
 * que solo existe dentro de Next. Separándolo, toda la lógica de
 * identidad (normalizar teléfonos, hashear códigos, validar sesiones)
 * queda probable con `node --test` sin levantar la aplicación — que es
 * justo lo que faltaba: CI no miraba nada de este código.
 */

import { cookies } from 'next/headers';
import { userForToken, SESSION_COOKIE, type User } from './auth';

/**
 * Resuelto del lado servidor desde una cookie httpOnly con un token
 * opaco. Esta es la única forma legítima de saber quién pide algo: un
 * id que venga del cliente es una sugerencia, no una identidad.
 */
export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  return userForToken(store.get(SESSION_COOKIE)?.value);
}
