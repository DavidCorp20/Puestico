import { NextResponse } from 'next/server';
import { kycFor, setKyc, allKyc } from '../../../lib/store';

/**
 * Alta del conductor (simulada).
 *
 * submit  → el conductor carga sus documentos y queda "en verificación"
 * approve → operaciones lo habilita
 * reject  → operaciones lo rechaza
 *
 * En producción esto lo hace el panel admin sobre la tabla driver_documents;
 * acá alcanza para mostrar el recorrido del conductor nuevo.
 */
import { REQUIRED_DOCUMENTS as REQUIRED } from '../../../lib/kyc';

export async function POST(request: Request) {
  const { action, driver_id, documents } = await request.json();

  if (!driver_id) {
    return NextResponse.json({ error: 'Falta el conductor' }, { status: 400 });
  }

  if (action === 'submit') {
    const docs: string[] = Array.isArray(documents) ? documents : [];
    const missing = REQUIRED.filter((r) => !docs.includes(r));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Falta cargar: ${missing.join(', ')}`, missing },
        { status: 400 },
      );
    }
    setKyc(driver_id, {
      driver_id,
      status: 'pending',
      documents: docs,
      submitted_at: new Date().toISOString(),
    });
    return NextResponse.json(kycFor(driver_id), { status: 201 });
  }

  if (action === 'approve' || action === 'reject') {
    const current = kycFor(driver_id);
    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: 'No hay una solicitud en verificación para este conductor' },
        { status: 400 },
      );
    }
    setKyc(driver_id, {
      ...current,
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
    });
    return NextResponse.json(kycFor(driver_id));
  }

  if (action === 'reset') {
    setKyc(driver_id, { driver_id, status: 'none', documents: [] });
    return NextResponse.json(kycFor(driver_id));
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}

export async function GET() {
  return NextResponse.json(allKyc());
}
