import { NextResponse } from 'next/server';
import { identityFor, setIdentity, normalizeCedula } from '../../../lib/auth';
import { currentUser } from '../../../lib/session';

/**
 * Verificación de identidad del pasajero.
 *
 * Dos cosas que decidí acá y que no son cosméticas:
 *
 * 1. **No guardamos la imagen.** Solo el hecho de que se entregó y una
 *    referencia. Un repositorio con cédulas y selfies dentro es la
 *    filtración de datos biométricos más común que existe; cuando
 *    haya almacenamiento real irá en un bucket privado con URLs
 *    firmadas, nunca en la base ni en el repo.
 *
 * 2. **La revisión es un estado, no un booleano.** pending → approved
 *    o rejected con motivo. Un "verificado sí/no" no permite decirle
 *    al usuario qué le falta, y esa es la mitad del valor.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión primero' }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'submit') {
    const cedula = normalizeCedula(body.id_number);
    if (!cedula) {
      return NextResponse.json(
        { error: 'La cédula no es válida. Escríbela así: V-12345678.' },
        { status: 400 },
      );
    }
    const fullName = String(body.full_name || '').trim();
    if (fullName.length < 5) {
      return NextResponse.json(
        { error: 'Escribe tu nombre completo, como aparece en la cédula.' },
        { status: 400 },
      );
    }
    if (!body.selfie) {
      return NextResponse.json(
        { error: 'Falta la foto de tu cara para comparar con la cédula.' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    setIdentity({
      user_id: user.id,
      status: 'pending',
      id_number: cedula,
      full_name: fullName,
      // Referencia, no la imagen. Ver la nota de arriba.
      selfie_ref: `selfie:${user.id}`,
      submitted_at: now,
      reason: '',
    });

    return NextResponse.json({ ok: true, status: 'pending' });
  }

  // Revisión: en el piloto la hace una persona desde el panel. Acá
  // queda el mismo camino que va a usar ese panel.
  if (action === 'approve' || action === 'reject') {
    const current = identityFor(user.id);
    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: 'No hay una solicitud pendiente que revisar.' },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    setIdentity({
      ...current,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      reason:
        action === 'reject'
          ? 'La foto de la cédula está borrosa. Tómala de nuevo con más luz.'
          : '',
    });
    return NextResponse.json({ ok: true, status: action === 'approve' ? 'approved' : 'rejected' });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión' }, { status: 401 });
  return NextResponse.json(identityFor(user.id));
}
