import { redirect } from 'next/navigation';
import { currentUser } from '../lib/session';
import { homeFor } from '../lib/guard';

/**
 * La raíz ya no es el buscador: es el portero.
 *
 * David lo pidió así y tiene razón — el orden importa. Antes la app
 * abría en el buscador y el login quedaba escondido detrás de un
 * botón, así que todo el mundo entraba a lo mismo y el rol era casi
 * decorativo. Ahora:
 *
 *   sin sesión           → /entrar (registrarse como pasajero o conductor)
 *   registro incompleto  → /entrar (a terminarlo)
 *   pasajero             → /buscar
 *   conductor            → /conductor
 *
 * Esta pantalla no dibuja nada: solo decide. Es un redirector, y por
 * eso no tiene interfaz que mantener.
 */
export default async function Root() {
  const user = await currentUser();

  if (!user || !user.name) redirect('/entrar');
  redirect(homeFor(user));
}
