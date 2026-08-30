/**
 * Identidad y sesión de Puestico.
 *
 * Tres decisiones que vale la pena dejar escritas, porque no son
 * obvias y condicionan lo que venga después:
 *
 * 1. **El teléfono es la identidad.** No hay contraseña. En Venezuela
 *    el teléfono es el dato que todos tienen y el canal por el que ya
 *    se comunican; una contraseña más sería una barrera sin beneficio.
 *
 * 2. **El código se guarda hasheado, no en claro.** Un volcado de la
 *    base no debe permitir entrar a ninguna cuenta. Cuesta tres
 *    líneas y es la diferencia entre una fuga molesta y una grave.
 *
 * 3. **La cookie guarda un token opaco, no el usuario.** El navegador
 *    nunca lleva el id ni el rol: eso se resuelve del lado servidor
 *    en cada pedido. Si la cookie llevara el id, cualquiera la
 *    editaría y entraría como otro — que es exactamente el agujero
 *    que QA reportó con el pasajero sustituido en silencio.
 *
 * En modo demo (PUESTICO_DEMO_OTP distinto de '0') el código se
 * devuelve en la respuesta para poder probar sin proveedor de
 * mensajería. En producción se envía por WhatsApp — $0,0135 por
 * mensaje contra $0,231 del SMS, 17 veces más barato — y esta función
 * es el único lugar que hay que cambiar.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';

export const SESSION_COOKIE = 'puestico_session';

/**
 * Acceso rápido: entrar sin código de verificación.
 *
 * **Es temporal y se quita apagando este interruptor.** Existe porque
 * hoy WhatsApp no está conectado, así que sin esto no hay forma de
 * entrar a la app para verla ni mostrarla.
 *
 * Está detrás de una variable de entorno a propósito, y no de un `if`
 * suelto en la pantalla: el día que WhatsApp funcione se pone
 * `PUESTICO_QUICK_ACCESS=0` y el atajo desaparece del servidor
 * completo, no solo del botón. Un atajo de autenticación que se quita
 * escondiendo un botón no se quitó.
 *
 * Lo que NO hace: no crea sesiones sin registrar el teléfono ni saltea
 * la normalización. Crea una cuenta igual que las demás, solo se salta
 * el paso de comprobar que el número es tuyo.
 */
export function quickAccessEnabled(): boolean {
  return process.env.PUESTICO_QUICK_ACCESS !== '0';
}
const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_DAYS = 30;
/** Ventana antiflood: cuántos códigos por teléfono y en cuánto tiempo. */
const OTP_WINDOW_MIN = 15;
const OTP_MAX_PER_WINDOW = 4;

export type Role = 'passenger' | 'driver';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  rating: number;
  phone_verified_at?: string;
  /** Perfil de conductor con el que publica, si conduce. */
  driver_ref?: string;
}

// ─── Teléfono ──────────────────────────────────────────────────────

/**
 * Normaliza a E.164 venezolano (+58...).
 *
 * Acepta lo que la gente realmente escribe: 0412-1234567,
 * 04121234567, +584121234567, 412 1234567. Sin esto, el mismo
 * teléfono crea dos cuentas distintas y el usuario pierde su
 * historial sin entender por qué.
 */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!digits) return null;

  let local = digits;
  if (local.startsWith('58')) local = local.slice(2);
  if (local.startsWith('0')) local = local.slice(1);

  // Móvil venezolano: 4 + operadora (12/14/16/24/26) + 7 dígitos
  if (!/^4(12|14|16|24|26)\d{7}$/.test(local)) return null;
  return `+58${local}`;
}

/** Cómo se le muestra al usuario: 0412 123 4567 */
export function displayPhone(e164: string): string {
  const local = e164.replace('+58', '');
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

// ─── Códigos de verificación ───────────────────────────────────────

function hashCode(phone: string, code: string): string {
  // El teléfono entra en el hash: así el mismo código para dos
  // teléfonos distintos no produce el mismo hash.
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function sixDigits(): string {
  // randomInt sesgado no importa acá, pero randomBytes es igual de
  // simple y no tiene el problema.
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

export interface OtpResult {
  ok: boolean;
  error?: string;
  /** Solo en modo demo. */
  demo_code?: string;
  expires_in_min?: number;
}

export function requestOtp(rawPhone: string): OtpResult {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return {
      ok: false,
      error: 'Ese número no parece venezolano. Escríbelo como 0412 123 4567.',
    };
  }

  // Antiflood: sin esto, un script pide mil códigos y cada uno cuesta
  // dinero real cuando WhatsApp esté conectado.
  const since = new Date(Date.now() - OTP_WINDOW_MIN * 60_000).toISOString();
  const recent = db
    .prepare('SELECT COUNT(*) AS n FROM otp_codes WHERE phone = ? AND created_at > ?')
    .get(phone, since) as { n: number };
  if (recent.n >= OTP_MAX_PER_WINDOW) {
    return {
      ok: false,
      error: `Pediste demasiados códigos. Espera ${OTP_WINDOW_MIN} minutos e intenta de nuevo.`,
    };
  }

  const code = sixDigits();
  const now = new Date();
  db.prepare(
    `INSERT INTO otp_codes (id, phone, code_hash, channel, expires_at, created_at)
     VALUES (?,?,?,?,?,?)`,
  ).run(
    `otp-${randomBytes(8).toString('hex')}`,
    phone,
    hashCode(phone, code),
    'whatsapp',
    new Date(now.getTime() + OTP_TTL_MIN * 60_000).toISOString(),
    now.toISOString(),
  );

  const demo = process.env.PUESTICO_DEMO_OTP !== '0';
  if (!demo) {
    // Acá va el envío real por WhatsApp Cloud API. Un solo lugar.
    console.log(`[otp] enviar ${code} a ${phone} por WhatsApp`);
  }

  return {
    ok: true,
    demo_code: demo ? code : undefined,
    expires_in_min: OTP_TTL_MIN,
  };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  user?: User;
  token?: string;
  is_new?: boolean;
}

export function verifyOtp(rawPhone: string, code: string): VerifyResult {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: 'Número inválido.' };

  const row = db
    .prepare(
      `SELECT * FROM otp_codes
       WHERE phone = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phone) as Record<string, unknown> | undefined;

  if (!row) {
    return { ok: false, error: 'Pide un código nuevo: este ya no sirve.' };
  }
  if (new Date(row.expires_at as string) < new Date()) {
    return { ok: false, error: 'El código venció. Pide uno nuevo.' };
  }
  if ((row.attempts as number) >= OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      error: 'Demasiados intentos con este código. Pide uno nuevo.',
    };
  }

  const given = hashCode(phone, (code || '').trim());
  const stored = row.code_hash as string;
  // timingSafeEqual sobre hashes de largo fijo: comparar con === filtra
  // información por tiempo. Es barato hacerlo bien.
  const equal =
    given.length === stored.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(stored));

  if (!equal) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(
      row.id as string,
    );
    const left = OTP_MAX_ATTEMPTS - ((row.attempts as number) + 1);
    return {
      ok: false,
      error:
        left > 0
          ? `Código incorrecto. Te quedan ${left} intento${left === 1 ? '' : 's'}.`
          : 'Código incorrecto. Pide uno nuevo.',
    };
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE otp_codes SET consumed_at = ? WHERE id = ?').run(
    nowIso,
    row.id as string,
  );

  const { user, isNew } = upsertUser(phone, nowIso);
  const token = createSession(user.id);
  return { ok: true, user, token, is_new: isNew };
}

/**
 * Entra directo con un teléfono, sin código. Solo si el acceso rápido
 * está habilitado — la comprobación se repite acá y no solo en la ruta
 * de la API, para que no haya forma de llegar por otro camino.
 */
export function quickAccess(rawPhone: string): VerifyResult {
  if (!quickAccessEnabled()) {
    return { ok: false, error: 'El acceso rápido está desactivado.' };
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return {
      ok: false,
      error: 'Ese número no parece venezolano. Escríbelo como 0412 123 4567.',
    };
  }

  const nowIso = new Date().toISOString();
  const { user, isNew } = upsertUser(phone, nowIso);
  const token = createSession(user.id);
  return { ok: true, user, token, is_new: isNew };
}

// ─── Usuarios ──────────────────────────────────────────────────────

function toUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    phone: r.phone as string,
    name: r.name as string,
    role: r.role as Role,
    rating: r.rating as number,
    phone_verified_at: (r.phone_verified_at as string) || undefined,
    driver_ref: (r.driver_ref as string) || undefined,
  };
}

function upsertUser(phone: string, nowIso: string): { user: User; isNew: boolean } {
  const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as
    | Record<string, unknown>
    | undefined;

  if (existing) {
    db.prepare('UPDATE users SET phone_verified_at = ? WHERE id = ?').run(
      nowIso,
      existing.id as string,
    );
    return { user: { ...toUser(existing), phone_verified_at: nowIso }, isNew: false };
  }

  const id = `u-${randomBytes(8).toString('hex')}`;
  db.prepare(
    `INSERT INTO users (id, phone, name, role, rating, phone_verified_at, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(id, phone, '', 'passenger', 5, nowIso, nowIso);

  return {
    user: {
      id,
      phone,
      name: '',
      role: 'passenger',
      rating: 5,
      phone_verified_at: nowIso,
    },
    isNew: true,
  };
}

export function userById(id: string): User | undefined {
  const r = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return r ? toUser(r) : undefined;
}

export function updateUser(
  id: string,
  patch: { name?: string; role?: Role; driver_ref?: string },
) {
  if (patch.name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(patch.name, id);
  }
  if (patch.role !== undefined) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(patch.role, id);
  }
  if (patch.driver_ref !== undefined) {
    db.prepare('UPDATE users SET driver_ref = ? WHERE id = ?').run(
      patch.driver_ref,
      id,
    );
  }
}

/**
 * El id con el que esta cuenta actúa como conductor.
 *
 * Si eligió conducir y todavía no tiene perfil, su propio id sirve:
 * los viajes que publique quedan atados a él. Devuelve null si esta
 * cuenta no conduce.
 */
export function driverIdFor(user: User): string | null {
  if (user.role !== 'driver') return null;
  return user.driver_ref || user.id;
}

// ─── Sesiones ──────────────────────────────────────────────────────

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  db.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at)
     VALUES (?,?,?,?)`,
  ).run(
    token,
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
  );
  return token;
}

export function userForToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as Record<string, unknown> | undefined;
  return row ? toUser(row) : null;
}

export function revokeSession(token: string) {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE token = ?').run(
    new Date().toISOString(),
    token,
  );
}

/*
 * `currentUser()` NO vive acá: necesita `next/headers`, que solo existe
 * dentro de Next. Manteniendo este módulo libre de esa dependencia, las
 * reglas de identidad se pueden probar con `node --test` sin levantar
 * la aplicación. Está en lib/session.ts.
 */

/** Opciones de cookie compartidas para no divergir entre login y logout. */
export function cookieOptions() {
  // La app se prueba DENTRO de un iframe (la vista previa del chat), que
  // es otro sitio. Con SameSite=Lax el navegador NO manda la cookie en
  // las peticiones de ese iframe: la sesion se creaba bien y la
  // siguiente llamada llegaba sin cookie -> "No hay sesion". Con
  // SameSite=None si viaja, y None EXIGE Secure (por eso van juntos).
  const crossSite = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
    secure: crossSite,
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86_400,
  };
}

// ─── Verificación de identidad ─────────────────────────────────────

export type IdentityStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface IdentityCheck {
  user_id: string;
  status: IdentityStatus;
  id_number: string;
  full_name: string;
  selfie_ref: string;
  submitted_at?: string;
  reviewed_at?: string;
  reason: string;
}

export function identityFor(userId: string): IdentityCheck {
  const r = db
    .prepare('SELECT * FROM identity_checks WHERE user_id = ?')
    .get(userId) as Record<string, unknown> | undefined;
  if (!r) {
    return {
      user_id: userId,
      status: 'none',
      id_number: '',
      full_name: '',
      selfie_ref: '',
      reason: '',
    };
  }
  return {
    user_id: r.user_id as string,
    status: r.status as IdentityStatus,
    id_number: r.id_number as string,
    full_name: r.full_name as string,
    selfie_ref: r.selfie_ref as string,
    submitted_at: (r.submitted_at as string) || undefined,
    reviewed_at: (r.reviewed_at as string) || undefined,
    reason: r.reason as string,
  };
}

export function setIdentity(check: IdentityCheck) {
  db.prepare(
    `INSERT INTO identity_checks (user_id, status, id_number, full_name,
       selfie_ref, submitted_at, reviewed_at, reason)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       id_number = excluded.id_number,
       full_name = excluded.full_name,
       selfie_ref = excluded.selfie_ref,
       submitted_at = excluded.submitted_at,
       reviewed_at = excluded.reviewed_at,
       reason = excluded.reason`,
  ).run(
    check.user_id,
    check.status,
    check.id_number,
    check.full_name,
    check.selfie_ref,
    check.submitted_at ?? null,
    check.reviewed_at ?? null,
    check.reason,
  );
}

/**
 * Valida una cédula venezolana en el formato que la gente escribe.
 * Devuelve la forma canónica (V-12345678) o null.
 */
export function normalizeCedula(raw: string): string | null {
  const s = (raw || '').toUpperCase().replace(/[^VE0-9]/g, '');
  const m = s.match(/^([VE])?(\d{6,9})$/);
  if (!m) return null;
  return `${m[1] || 'V'}-${m[2]}`;
}
