import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requestOtp, verifyOtp, updateUser, revokeSession, SESSION_COOKIE, cookieOptions, displayPhone } from '../../../lib/auth';
import { currentUser } from '../../../lib/session';
import { TEST_DRIVERS } from '../../../lib/data';
import { homeFor } from '../../../lib/guard';

/**
 * Inicio de sesión por teléfono.
 *
 * request → manda el código
 * verify  → lo valida, crea la sesión y pone la cookie
 * profile → completa el nombre la primera vez
 * logout  → revoca la sesión del lado servidor, no solo la cookie
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === 'request') {
    const res = requestOtp(body.phone);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res);
  }

  if (action === 'verify') {
    const res = verifyOtp(body.phone, body.code);
    if (!res.ok || !res.token || !res.user) {
      return NextResponse.json({ error: res.error }, { status: 401 });
    }
    const store = await cookies();
    store.set(SESSION_COOKIE, res.token, cookieOptions());
    return NextResponse.json({
      ok: true,
      is_new: res.is_new,
      needs_name: !res.user.name,
      // El rol GUARDADO decide a dónde entra, no el que tocó en la
      // pantalla: si ya tenía cuenta de conductor, va a su panel.
      home: res.user.name ? homeFor(res.user) : null,
      user: {
        id: res.user.id,
        name: res.user.name,
        phone: displayPhone(res.user.phone),
        role: res.user.role,
      },
    });
  }

  if (action === 'profile') {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'No hay sesión' }, { status: 401 });

    const name = String(body.name || '').trim();
    if (name.length < 3) {
      return NextResponse.json(
        { error: 'Escribe tu nombre y apellido.' },
        { status: 400 },
      );
    }
    const role = body.role === 'driver' ? 'driver' : 'passenger';

    // Decisión de DEMO, explícita: quien entra como conductor adopta
    // un perfil de conductor semilla, para que vea de una viajes
    // publicados, solicitudes y conversaciones en vez de una pantalla
    // vacía. En producción esto lo reemplaza el alta real del
    // conductor (documentos + vehículo) y el perfil se crea propio.
    const driverRef =
      role === 'driver' && !user.driver_ref ? TEST_DRIVERS[0].id : undefined;

    updateUser(user.id, { name, role, driver_ref: driverRef });
    return NextResponse.json({
      ok: true,
      name,
      role,
      home: homeFor({ role }),
    });
  }

  // Cambiar de rol: el mismo teléfono, la otra app. Necesita sesión y
  // solo puede cambiar el rol de UNO MISMO — el id sale de la sesión.
  if (action === 'switch-role') {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'No hay sesión' }, { status: 401 });

    const role = body.role === 'driver' ? 'driver' : 'passenger';
    if (role === user.role) {
      return NextResponse.json(
        { error: `Ya estás usando Puestico como ${role === 'driver' ? 'conductor' : 'pasajero'}.` },
        { status: 400 },
      );
    }

    // Al pasar a conductor por primera vez necesita un perfil con el
    // que publicar. Ver la nota del alta más arriba.
    const driverRef =
      role === 'driver' && !user.driver_ref ? TEST_DRIVERS[0].id : undefined;

    updateUser(user.id, { role, driver_ref: driverRef });
    return NextResponse.json({ ok: true, role, home: homeFor({ role }) });
  }

  if (action === 'logout') {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    // Revocar del lado servidor: borrar la cookie sola dejaría el token
    // vivo para quien lo hubiera copiado.
    if (token) revokeSession(token);
    store.delete(SESSION_COOKIE);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}

/** Quién soy — lo usa el cliente para saber si mostrar el login. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      phone: displayPhone(user.phone),
      role: user.role,
      rating: user.rating,
    },
  });
}
