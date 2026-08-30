import { NextRequest, NextResponse } from 'next/server';

/**
 * Puerta de entrada de la demo.
 *
 * Por qué existe: David pasó el enlace sin querer a alguien que no
 * debía verlo. Cambiar el enlace ayuda, pero un enlace es un secreto
 * malísimo — se reenvía, queda en el historial de un chat, aparece en
 * una captura. Así que además del enlace nuevo, la demo pide una clave.
 *
 * Cómo funciona:
 *  · Sin clave válida, TODA la app responde 401 y muestra la pantalla
 *    de acceso. No solo se esconde el contenido: el servidor no lo
 *    entrega, así que tampoco sirve saber una dirección interna.
 *  · Al acertar, se guarda una cookie firmada por el propio valor de
 *    la clave. Si la clave cambia, todas las sesiones abiertas
 *    caducan de golpe — eso es lo que hace que "dar de baja" el
 *    acceso anterior sea real y no un gesto.
 *  · Con PUESTICO_DEMO_KEY sin definir, la puerta no existe. Así el
 *    desarrollo local y las pruebas no cambian.
 *
 * Se hace en el middleware y no en cada pantalla a propósito: una
 * comprobación por pantalla es una lista que siempre le falta una.
 */

const COOKIE = 'puestico_gate';

function expectedToken(key: string): string {
  // No es criptografía fuerte y no pretende serlo: es un valor derivado
  // de la clave, para que la cookie no CONTENGA la clave y para que
  // rotar la clave invalide las cookies viejas.
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `v1.${h.toString(36)}${key.length.toString(36)}`;
}

function gatePage(message?: string) {
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Puestico — acceso privado</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: radial-gradient(120% 70% at 50% 0%, #123024, #0D1218 55%, #0A0E13);
    color: #F2F5F7;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .box {
    width: 100%; max-width: 380px; text-align: center;
    background: rgba(20,26,33,.93); border: 1px solid rgba(255,255,255,.14);
    border-radius: 22px; padding: 30px 24px;
    box-shadow: 0 18px 44px rgba(0,0,0,.4);
  }
  h1 { font-size: 1.5rem; letter-spacing: -.03em; margin-bottom: 8px; }
  p { color: #C3CDD8; font-size: .93rem; line-height: 1.5; margin-bottom: 20px; }
  input {
    width: 100%; padding: 14px; font-size: 1rem; text-align: center;
    letter-spacing: .06em; border-radius: 14px; margin-bottom: 12px;
    background: rgba(28,35,44,.96); border: 2px solid #3B4854; color: #F2F5F7;
  }
  input:focus { outline: none; border-color: #22C55E; }
  button {
    width: 100%; padding: 15px; font-size: 1rem; font-weight: 700;
    border: none; border-radius: 14px; cursor: pointer; color: #0F1419;
    background: linear-gradient(135deg, #12B854, #16A34A);
  }
  .err { color: #F26D6D; font-size: .86rem; margin: 0 0 12px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #22C55E;
         display: inline-block; box-shadow: 0 0 0 5px rgba(34,197,94,.16); }
</style></head>
<body><form class="box" method="POST" action="/__acceso">
  <span class="dot"></span>
  <h1>Puestico</h1>
  <p>Esta demostración es privada. Escribe la clave de acceso para continuar.</p>
  ${message ? `<p class="err">${message}</p>` : ''}
  <input name="key" type="password" placeholder="Clave de acceso" autofocus
         autocomplete="off" autocapitalize="off" spellcheck="false">
  <button type="submit">Entrar</button>
</form></body></html>`;

  return new NextResponse(html, {
    status: 401,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Que no quede en ninguna caché intermedia.
      'cache-control': 'no-store, private',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export async function middleware(request: NextRequest) {
  const key = process.env.PUESTICO_DEMO_KEY;
  if (!key) return NextResponse.next();

  const token = expectedToken(key);
  const { pathname } = request.nextUrl;

  // Envío del formulario de la puerta.
  if (pathname === '/__acceso' && request.method === 'POST') {
    const form = await request.formData();
    const given = String(form.get('key') || '');
    if (given !== key) {
      return gatePage('Clave incorrecta.');
    }
    const res = NextResponse.redirect(new URL('/', request.url));
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      // La demo se abre dentro de una ventana incrustada: con Lax el
      // navegador no devolvería la cookie y la puerta no se abriría
      // nunca. Es el mismo detalle que rompía el inicio de sesión.
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 12 * 60 * 60, // 12 h: es una demo, no una cuenta
    });
    return res;
  }

  if (request.cookies.get(COOKIE)?.value === token) {
    return NextResponse.next();
  }

  return gatePage();
}

export const config = {
  // Todo pasa por la puerta menos los archivos estáticos, que no
  // revelan nada por sí solos.
  matcher: ['/((?!_next/static|_next/image|favicon|fonts|manifest).*)'],
};
