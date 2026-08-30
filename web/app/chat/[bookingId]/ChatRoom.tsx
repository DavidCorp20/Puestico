'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * La sala de chat.
 *
 * Decisiones que importan:
 *
 * · **Sondeo cada 4 segundos, no websockets.** Con conversaciones de
 *   diez mensajes alrededor de un viaje, un websocket agrega una pieza
 *   de infraestructura (y su costo) para resolver algo que el sondeo
 *   resuelve igual de bien. Cuando el volumen lo justifique se cambia
 *   en un solo lugar.
 *
 * · **El sondeo se detiene cuando la pestaña no se ve.** Sin esto, una
 *   pestaña olvidada pega a la API toda la noche. Es la diferencia
 *   entre un costo previsible y una factura sorpresa.
 *
 * · **Respuestas rápidas.** En un chat de viaje el 80% de lo que se
 *   dice son cuatro frases: dónde te espero, ya salí, voy llegando,
 *   dame cinco minutos. Ofrecerlas de un toque es lo que hace que la
 *   gente lo use en la calle, con una mano y apurada.
 */
interface Message {
  id: string;
  sender_role: 'passenger' | 'driver';
  sender_name: string;
  body: string;
  created_at: string;
}

const QUICK_PASSENGER = [
  '¿Dónde te espero?',
  'Ya estoy en el punto',
  'Voy llegando, dame 5 minutos',
  '¿Sigue en pie el viaje?',
];

const QUICK_DRIVER = [
  'Te espero en el punto de siempre',
  'Ya voy saliendo',
  'Estoy llegando',
  'Se me atrasó, dame 10 minutos',
];

export default function ChatRoom({
  bookingId,
  role,
  otherName,
  initial,
  closed,
  pickup,
  time,
}: {
  bookingId: string;
  role: 'passenger' | 'driver';
  otherName: string;
  initial: Message[];
  closed: boolean;
  pickup: string;
  time: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToEnd = () => endRef.current?.scrollIntoView({ block: 'end' });

  useEffect(() => {
    scrollToEnd();
  }, [messages.length]);

  // Sondeo con pausa cuando la pestaña está oculta.
  useEffect(() => {
    if (closed) return;
    let alive = true;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/chat?booking=${bookingId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.messages)) setMessages(data.messages);
      } catch {
        // Un fallo de red puntual no debe romper la pantalla: el
        // siguiente ciclo lo resuelve.
      }
    }

    const id = setInterval(poll, 4000);
    document.addEventListener('visibilitychange', poll);
    poll();

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [bookingId, closed]);

  async function send(body: string) {
    const clean = body.trim();
    if (!clean || sending) return;

    setSending(true);
    setError('');

    // Eco optimista: el mensaje aparece al instante. Si falla, se
    // retira y se avisa — se siente rápido sin mentir.
    const temp: Message = {
      id: `temp-${Date.now()}`,
      sender_role: role,
      sender_name: 'Tú',
      body: clean,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, temp]);
    setText('');

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, body: clean }),
    });

    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setError(data.error || 'No se pudo enviar el mensaje.');
      setText(clean);
      return;
    }

    const saved: Message = await res.json();
    setMessages((m) => m.map((x) => (x.id === temp.id ? saved : x)));
    inputRef.current?.focus();
  }

  const quick = role === 'passenger' ? QUICK_PASSENGER : QUICK_DRIVER;

  function hour(iso: string) {
    return new Date(iso).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <>
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <strong>Escríbele a {otherName.split(' ')[0]}</strong>
            <small>
              Para acordar el punto exacto en {pickup} antes de las {time}.
            </small>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.sender_role === role;
          // Agrupar mensajes seguidos de la misma persona: sin esto el
          // hilo se ve como una lista, no como una conversación.
          const prev = messages[i - 1];
          const grouped = prev && prev.sender_role === m.sender_role;

          return (
            <div
              key={m.id}
              className={`bubble-row ${mine ? 'mine' : 'theirs'} ${
                grouped ? 'grouped' : ''
              }`}
            >
              <div className="bubble">
                {m.body}
                <span className="bubble-time">{hour(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="alert alert-warn">
          <strong>No se envió</strong>
          {error}
        </div>
      )}

      {closed ? (
        <div className="chat-closed">
          Este viaje ya no está activo, así que la conversación quedó cerrada.
        </div>
      ) : (
        <div className="chat-composer">
          {messages.length < 6 && (
            <div className="quick-replies">
              {quick.map((q) => (
                <button
                  key={q}
                  className="quick-reply"
                  onClick={() => send(q)}
                  disabled={sending}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="composer-row"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              ref={inputRef}
              className="composer-input"
              type="text"
              placeholder={`Escríbele a ${otherName.split(' ')[0]}…`}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="composer-send"
              aria-label="Enviar"
              disabled={sending || !text.trim()}
            >
              {sending ? <span className="spinner" /> : '↑'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
