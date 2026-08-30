'use client';

import { useEffect, useRef, useState } from 'react';
import LogoMark from '../LogoMark';

/**
 * Entrar a Puestico.
 *
 * David dijo que estaba "muy básico" y tenía razón: era correcto y
 * aburrido, que en la primera pantalla es lo peor que puede ser. Es lo
 * único que ve alguien que todavía no confía en la app, así que acá se
 * decide si parece un producto o un formulario.
 *
 * Lo que cambió y por qué:
 *
 * · **Fondo con el corredor dibujado.** La montaña del Ávila y la ruta
 *   Guatire–Caracas detrás del contenido. Cuenta de qué es la app antes
 *   de leer una palabra, y es nuestro y no de una plantilla.
 * · **Una prueba social concreta** en la primera pantalla: cuánto se
 *   ahorra en la ruta principal. Un número real convence más que un
 *   adjetivo.
 * · **Ritmo.** Cada paso entra con un desplazamiento corto y los
 *   elementos aparecen escalonados. Sin eso, cambiar de paso se siente
 *   como recargar la página.
 * · **Progreso visible.** Tres puntos arriba: la persona sabe cuánto
 *   falta, que es lo que evita que abandone en el paso del código.
 *
 * El acceso rápido (entrar sin código) es TEMPORAL y vive detrás de
 * `PUESTICO_QUICK_ACCESS`; ver lib/auth.ts.
 */
type Step = 'role' | 'phone' | 'code' | 'name';

const STEP_INDEX: Record<Step, number> = { role: 0, phone: 1, code: 2, name: 2 };

const QUICK_PASSENGER = [
  '¿Dónde te espero?',
  'Ya estoy en el punto',
];

export default function LoginFlow({
  next,
  needsName,
  quickAccess,
}: {
  next: string;
  needsName: boolean;
  quickAccess: boolean;
}) {
  const [step, setStep] = useState<Step>(needsName ? 'name' : 'role');
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [name, setName] = useState('');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    if (step === 'code') boxes.current[0]?.focus();
  }, [step]);

  function formatPhone(raw: string) {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 4) return d;
    if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }

  async function post(payload: Record<string, unknown>) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function sendCode(resend = false) {
    setLoading(true);
    setError('');
    const { ok, data } = await post({ action: 'request', phone });
    setLoading(false);
    if (!ok) {
      setError(data.error || 'No se pudo enviar el código.');
      return;
    }
    setDemoCode(data.demo_code || '');
    setSeconds(45);
    if (!resend) {
      setStep('code');
      setDigits(Array(6).fill(''));
    }
  }

  /** Entrar sin código. Temporal, ver la nota de arriba. */
  async function enterWithoutCode() {
    setLoading(true);
    setError('');
    const { ok, data } = await post({ action: 'quick', phone });
    setLoading(false);
    if (!ok) {
      setError(data.error || 'No se pudo entrar.');
      return;
    }
    if (data.needs_name) {
      setStep('name');
      return;
    }
    window.location.href = data.home || next;
  }

  async function verify(code: string) {
    setLoading(true);
    setError('');
    const { ok, data } = await post({ action: 'verify', phone, code });
    setLoading(false);
    if (!ok) {
      setError(data.error || 'Código incorrecto.');
      setDigits(Array(6).fill(''));
      boxes.current[0]?.focus();
      return;
    }
    if (data.needs_name) {
      setStep('name');
      return;
    }
    window.location.href = data.home || next;
  }

  async function saveName() {
    setLoading(true);
    setError('');
    const { ok, data } = await post({ action: 'profile', name, role });
    setLoading(false);
    if (!ok) {
      // 401 aca significa que la sesion no llego (cookie bloqueada), no
      // que el nombre este mal: decirlo distinto evita que la persona
      // reescriba su nombre diez veces sin que cambie nada.
      setError(
        data.error === 'No hay sesión'
          ? 'Se perdio la sesion. Toca "Entrar sin codigo" otra vez y no cierres la pestania.'
          : data.error || 'No se pudo guardar tu nombre.',
      );
      return;
    }
    window.location.href = data.home || (role === 'driver' ? '/conductor' : '/buscar');
  }

  function setDigit(i: number, value: string) {
    const chars = value.replace(/\D/g, '');
    if (chars.length > 1) {
      const filled = Array(6).fill('');
      chars.slice(0, 6).split('').forEach((c, k) => (filled[k] = c));
      setDigits(filled);
      if (chars.length >= 6) verify(filled.join(''));
      else boxes.current[Math.min(chars.length, 5)]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[i] = chars;
    setDigits(nextDigits);
    if (chars && i < 5) boxes.current[i + 1]?.focus();

    const joined = nextDigits.join('');
    if (joined.length === 6 && !joined.includes('')) verify(joined);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      boxes.current[i - 1]?.focus();
      const nextDigits = [...digits];
      nextDigits[i - 1] = '';
      setDigits(nextDigits);
    }
  }

  /** Tres puntos de avance. Saber cuánto falta evita el abandono. */
  const Progress = () => (
    <div className="auth-steps" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`as-dot ${
            i < STEP_INDEX[step] ? 'done' : i === STEP_INDEX[step] ? 'on' : ''
          }`}
        />
      ))}
    </div>
  );

  // ─── Paso 0: ¿pasajero o conductor? ─────────────────────
  if (step === 'role') {
    return (
      <div className="auth-wrap step-in">
        <div className="auth-brand">
          <LogoMark size={78} animate />
          <h1 className="auth-wordmark">Puestico</h1>
          <p className="auth-claim">Alguien ya va para allá. Móntate.</p>
        </div>

        {/* Un número real convence más que un adjetivo. */}
        <div className="auth-proof rise" style={{ '--d': '80ms' } as React.CSSProperties}>
          <span className="ap-line">
            <strong>Guatire → Chacaíto</strong>
          </span>
          <span className="ap-nums">
            <em className="ap-was">$14,50 en taxi</em>
            <span className="ap-arrow">→</span>
            <strong className="ap-now">$7,25</strong>
          </span>
          <span className="ap-tag">50% menos, en el mismo carro que ya iba</span>
        </div>

        <p className="role-ask rise" style={{ '--d': '160ms' } as React.CSSProperties}>
          ¿Cómo vas a usar Puestico?
        </p>

        <div className="role-cards">
          <button
            type="button"
            className="role-card rise"
            style={{ '--d': '220ms' } as React.CSSProperties}
            onClick={() => {
              setRole('passenger');
              setStep('phone');
            }}
          >
            <span className="rc-icon rc-icon-pass">🎫</span>
            <span className="rc-main">
              <strong>Busco puesto</strong>
              <small>Necesito llegar y quiero pagar menos que un taxi.</small>
            </span>
            <span className="rc-chevron">→</span>
          </button>

          <button
            type="button"
            className="role-card rise"
            style={{ '--d': '300ms' } as React.CSSProperties}
            onClick={() => {
              setRole('driver');
              setStep('phone');
            }}
          >
            <span className="rc-icon rc-icon-drive">🚗</span>
            <span className="rc-main">
              <strong>Tengo carro</strong>
              <small>Ya hago el viaje y quiero recuperar la gasolina.</small>
            </span>
            <span className="rc-chevron">→</span>
          </button>
        </div>

        <p className="auth-legal rise" style={{ '--d': '380ms' } as React.CSSProperties}>
          Puestico conecta particulares que comparten los gastos de un viaje que
          ya iban a hacer. Puedes cambiar de rol después.
        </p>
      </div>
    );
  }

  // ─── Paso 1: teléfono ───────────────────────────────────
  if (step === 'phone') {
    return (
      <div className="auth-wrap step-in">
        <Progress />

        <button className="auth-back" onClick={() => setStep('role')}>
          ← Volver
        </button>

        <div className="auth-head">
          <span className={`role-chip role-${role}`}>
            {role === 'driver' ? '🚗 Conductor' : '🎫 Pasajero'}
          </span>
          <h1 className="auth-title">¿Cuál es tu teléfono?</h1>
          <p className="auth-sub">
            Te mandamos un código por WhatsApp para confirmar que eres tú. Sin
            contraseñas.
          </p>
        </div>

        <form
          className="auth-card"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <div className="phone-input">
            <span className="phone-cc">
              <span className="cc-flag" aria-hidden="true">
                <em />
                <em />
                <em />
              </span>
              +58
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="0412 123 4567"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              aria-label="Tu número de teléfono"
              autoFocus
            />
          </div>

          {error && (
            <div className="alert alert-warn">
              <strong>Revisa el número</strong>
              {error}
            </div>
          )}

          <button className="btn btn-lg" disabled={loading || phone.length < 11}>
            {loading ? (
              <>
                <span className="spinner" /> Enviando el código…
              </>
            ) : (
              'Continuar'
            )}
          </button>

          {/* TEMPORAL: mientras WhatsApp no esté conectado. Se apaga
              con PUESTICO_QUICK_ACCESS=0 y desaparece del servidor. */}
          {quickAccess && (
            <div className="quick-access">
              <span className="qa-divider">
                <em>mientras probamos</em>
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={enterWithoutCode}
                disabled={loading || phone.length < 11}
              >
                Entrar sin código
              </button>
              <small className="qa-note">
                Atajo temporal para probar la app sin WhatsApp conectado. Se quita
                al conectarlo.
              </small>
            </div>
          )}
        </form>

        <p className="auth-legal">Al continuar aceptas los términos de uso.</p>
      </div>
    );
  }

  // ─── Paso 2: código ─────────────────────────────────────
  if (step === 'code') {
    return (
      <div className="auth-wrap step-in">
        <Progress />

        <button
          className="auth-back"
          onClick={() => {
            setStep('phone');
            setError('');
            setDemoCode('');
          }}
        >
          ← Cambiar el número
        </button>

        <div className="auth-head">
          <span className="auth-glyph">
            <span className="ag-ring" />
            💬
          </span>
          <h1 className="auth-title">Escribe el código</h1>
          <p className="auth-sub">
            Se lo mandamos a <strong className="auth-phone">{phone}</strong>
          </p>
        </div>

        <div className="auth-card">
          <div className="otp-row">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                className={`otp-box ${d ? 'filled' : ''}`}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={d}
                aria-label={`Dígito ${i + 1} de 6`}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                disabled={loading}
              />
            ))}
          </div>

          {loading && (
            <p className="otp-checking">
              <span className="spinner" /> Verificando…
            </p>
          )}

          {error && (
            <div className="alert alert-warn">
              <strong>Código incorrecto</strong>
              {error}
            </div>
          )}

          {demoCode && (
            <div className="demo-code">
              <span className="demo-code-label">Modo demo</span>
              Tu código es <strong>{demoCode}</strong>
              <small>
                Cuando WhatsApp esté conectado, el código llega al teléfono y no se
                muestra acá.
              </small>
            </div>
          )}

          <div className="auth-actions">
            {seconds > 0 ? (
              <span className="note">Puedes pedir otro en {seconds}s</span>
            ) : (
              <button
                className="link-btn"
                onClick={() => sendCode(true)}
                disabled={loading}
              >
                Enviar el código de nuevo
              </button>
            )}
          </div>

          {quickAccess && (
            <div className="quick-access">
              <span className="qa-divider">
                <em>mientras probamos</em>
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={enterWithoutCode}
                disabled={loading}
              >
                Entrar sin código
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Paso 3: nombre ─────────────────────────────────────
  return (
    <div className="auth-wrap step-in">
      <Progress />

      <div className="auth-head">
        <span className="auth-glyph">
          <span className="ag-ring" />
          👋
        </span>
        <h1 className="auth-title">¿Cómo te llamas?</h1>
        <p className="auth-sub">
          {role === 'driver'
            ? 'Es lo que ve el pasajero antes de reservar tu puesto.'
            : 'Es lo que ve el conductor antes de aceptarte en su carro.'}
        </p>
      </div>

      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          saveName();
        }}
      >
        <div className="field">
          <label htmlFor="nom">Nombre y apellido</label>
          <input
            id="nom"
            type="text"
            autoComplete="name"
            placeholder="María González"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={`role-confirm role-${role}`}>
          <span className="rc-badge">{role === 'driver' ? '🚗' : '🎫'}</span>
          <span className="rc-text">
            <strong>
              Te registras como {role === 'driver' ? 'conductor' : 'pasajero'}
            </strong>
            <small>
              {role === 'driver'
                ? 'Vas a publicar viajes y recibir solicitudes.'
                : 'Vas a buscar y reservar puestos.'}
            </small>
          </span>
          <button
            type="button"
            className="rc-change"
            onClick={() => setStep('role')}
          >
            Cambiar
          </button>
        </div>

        {error && (
          <div className="alert alert-warn">
            <strong>Falta algo</strong>
            {error}
          </div>
        )}

        <button className="btn btn-lg" disabled={loading || name.trim().length < 3}>
          {loading ? (
            <>
              <span className="spinner" /> Guardando…
            </>
          ) : (
            'Entrar a Puestico'
          )}
        </button>
      </form>
    </div>
  );
}
