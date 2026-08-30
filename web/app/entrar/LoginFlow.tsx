'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from '../Logo';

/**
 * Entrar con el teléfono, en tres pasos y sin contraseña.
 *
 * Decisiones de interfaz que valen más que el código:
 *
 * · **Un dato por pantalla.** Teléfono, después código, después
 *   nombre. Un formulario con todo junto se siente como un trámite;
 *   así se siente como una app.
 *
 * · **Los seis dígitos son seis casillas** con avance automático,
 *   pegado desde el portapapeles y borrado hacia atrás. Es el detalle
 *   que separa "hecho" de "hecho bien" en este flujo.
 *
 * · **El código se muestra en pantalla en modo demo.** No es un
 *   descuido: sin proveedor de mensajería conectado, esconderlo haría
 *   la demo imposible de probar. Va rotulado como demo.
 */
type Step = 'role' | 'phone' | 'code' | 'name';

export default function LoginFlow({
  next,
  needsName,
}: {
  next: string;
  needsName: boolean;
}) {
  // El rol se elige PRIMERO, antes del teléfono: David pidió que el
  // registro decida desde el arranque si entras como pasajero o como
  // conductor, porque los dos ven apps distintas.
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

  // Cuenta atrás para poder reenviar. Evita que el usuario machaque el
  // botón y que nosotros gastemos mensajes de más.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    if (step === 'code') boxes.current[0]?.focus();
  }, [step]);

  /** Formato venezolano mientras se escribe: 0412 123 4567 */
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
    // Primera vez: falta el nombre. Ya conocido: a su casa.
    if (data.needs_name) {
      setStep('name');
      return;
    }
    // El rol guardado manda sobre el que eligió en la pantalla: si ya
    // tenía cuenta de conductor, entra como conductor aunque haya
    // tocado "busco puesto".
    window.location.href = data.home || next;
  }

  async function saveName() {
    setLoading(true);
    setError('');
    const { ok, data } = await post({ action: 'profile', name, role });
    setLoading(false);
    if (!ok) {
      setError(data.error || 'No se pudo guardar tu nombre.');
      return;
    }
    // Cada rol a su casa. `next` solo se respeta si el usuario venía de
    // una pantalla concreta que su rol puede ver.
    window.location.href = role === 'driver' ? '/conductor' : next || '/buscar';
  }

  function setDigit(i: number, value: string) {
    // Pegar los seis de una vez tiene que funcionar: es lo que hace
    // cualquiera que copia el código del mensaje.
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
    // Retroceso en una casilla vacía salta a la anterior: sin esto,
    // corregir un dígito obliga a usar el dedo.
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      boxes.current[i - 1]?.focus();
      const nextDigits = [...digits];
      nextDigits[i - 1] = '';
      setDigits(nextDigits);
    }
  }

  // ─── Paso 0: ¿pasajero o conductor? ─────────────────────
  //
  // Va primero a propósito. Las dos apps son distintas, así que
  // preguntarlo al final (después del teléfono y del código) obligaba
  // a rehacer el camino mental. Acá el usuario declara qué viene a
  // hacer y todo lo demás se acomoda.
  if (step === 'role') {
    return (
      <div className="auth-wrap fade-in">
        <div className="auth-hero">
          <Logo size={54} />
          <h1 className="auth-title">Alguien ya va para allá</h1>
          <p className="auth-sub">
            Reserva el puesto libre de un carro que ya iba a salir.
          </p>
        </div>

        <p className="role-ask">¿Cómo vas a usar Puestico?</p>

        <div className="role-cards">
          <button
            type="button"
            className="role-card"
            onClick={() => {
              setRole('passenger');
              setStep('phone');
            }}
          >
            <span className="rc-emoji">🎫</span>
            <strong>Busco puesto</strong>
            <small>
              Necesito llegar a algún lado y quiero pagar menos que un taxi.
            </small>
            <span className="rc-go">Entrar como pasajero →</span>
          </button>

          <button
            type="button"
            className="role-card"
            onClick={() => {
              setRole('driver');
              setStep('phone');
            }}
          >
            <span className="rc-emoji">🚗</span>
            <strong>Tengo carro</strong>
            <small>
              Ya hago el viaje y quiero recuperar la gasolina llenando los
              puestos vacíos.
            </small>
            <span className="rc-go">Entrar como conductor →</span>
          </button>
        </div>

        <p className="auth-legal">
          Puestico conecta particulares que comparten los gastos de un viaje
          que ya iban a hacer. Puedes cambiar de rol después desde tu cuenta.
        </p>
      </div>
    );
  }

  // ─── Paso 1: teléfono ───────────────────────────────────
  if (step === 'phone') {
    return (
      <div className="auth-wrap fade-in">
        <div className="auth-hero">
          <span className={`role-chip role-${role}`}>
            {role === 'driver' ? '🚗 Conductor' : '🎫 Pasajero'}
            <button
              type="button"
              className="role-chip-change"
              onClick={() => setStep('role')}
            >
              cambiar
            </button>
          </span>
          <h1 className="auth-title">Entra con tu teléfono</h1>
          <p className="auth-sub">
            Sin contraseñas que recordar. Te confirmamos que eres tú con un
            código.
          </p>
        </div>

        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <div className="field">
            <label htmlFor="tel">¿Cuál es tu teléfono?</label>
            <div className="phone-input">
              <span className="phone-cc">🇻🇪 +58</span>
              <input
                id="tel"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="0412 123 4567"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                autoFocus
              />
            </div>
            <small className="field-hint">
              Te mandamos un código por WhatsApp para confirmar que eres tú.
            </small>
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
        </form>

        <p className="auth-legal">
          Al continuar aceptas los términos de uso.
        </p>
      </div>
    );
  }

  // ─── Paso 2: código ─────────────────────────────────────
  if (step === 'code') {
    return (
      <div className="auth-wrap fade-in">
        <div className="auth-hero">
          <div className="auth-icon">💬</div>
          <h1 className="auth-title">Escribe el código</h1>
          <p className="auth-sub">
            Se lo mandamos a <strong>{phone}</strong> por WhatsApp.
          </p>
        </div>

        <div className="card">
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
            <p className="note" style={{ textAlign: 'center' }}>
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
                Cuando WhatsApp esté conectado, este código llega al teléfono y
                no se muestra acá.
              </small>
            </div>
          )}

          <div className="auth-actions">
            {seconds > 0 ? (
              <span className="note">Puedes pedir otro en {seconds}s</span>
            ) : (
              <button className="link-btn" onClick={() => sendCode(true)} disabled={loading}>
                Enviar el código de nuevo
              </button>
            )}
            <button
              className="link-btn"
              onClick={() => {
                setStep('phone');
                setError('');
                setDemoCode('');
              }}
            >
              Cambiar el número
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Paso 3: nombre y para qué entra ────────────────────
  return (
    <div className="auth-wrap fade-in">
      <div className="auth-hero">
        <div className="auth-icon">👋</div>
        <h1 className="auth-title">¿Cómo te llamas?</h1>
        <p className="auth-sub">
          {role === 'driver'
            ? 'Es lo que ve el pasajero antes de reservar tu puesto.'
            : 'Es lo que ve el conductor antes de aceptarte en su carro.'}
        </p>
      </div>

      <form
        className="card"
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

        {/* El rol ya se eligió al principio; acá solo se confirma. */}
        <div className={`role-confirm role-${role}`}>
          <span className="rc-badge">
            {role === 'driver' ? '🚗' : '🎫'}
          </span>
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
