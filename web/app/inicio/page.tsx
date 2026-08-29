import { metrics } from '../../lib/metrics';
import { computeFare, passengerSavings, FARE } from '../../lib/fare';
import Logo from '../Logo';
import BottomNav from '../BottomNav';

export const metadata = {
  title: 'Puestico — Alguien ya va para allá. Móntate.',
};

function money(n: number): string {
  return n.toLocaleString('es-VE', { maximumFractionDigits: 0 });
}

export default function Inicio() {
  const m = metrics();
  const ruta = computeFare('Guatire', 'Chacaíto', '06:30');
  const ahorro = passengerSavings(ruta.suggested, ruta);

  return (
    <>
    <main className="screen landing" id="contenido">
      {/* ─── Propuesta ────────────────────────────── */}
      <section className="hero">
        <Logo size={64} />
        <h1 className="hero-title">
          Alguien ya va para allá.
          <br />
          <span className="accent-text">Móntate.</span>
        </h1>
        <p className="hero-sub">
          Reserva tu puesto en un carro que ya sale hacia tu destino.
          Pagas menos, llegas igual.
        </p>
        <div className="hero-cta">
          <a className="btn btn-lg" href="/">Buscar puesto</a>
          <a className="btn btn-ghost btn-lg" href="/metricas">
            Ver las métricas
          </a>
        </div>
      </section>

      {/* ─── Los tres números del corredor ────────── */}
      <section className="big-numbers">
        <div>
          <strong>{money(m.corridor_daily_trips)}</strong>
          <span>viajes por día en el corredor Guatire–Caracas</span>
        </div>
        <div>
          <strong>−{ahorro.percent}%</strong>
          <span>paga el pasajero contra un viaje privado</span>
        </div>
        <div>
          <strong>${money(m.driver_monthly)}</strong>
          <span>de ingreso extra al mes para el conductor</span>
        </div>
      </section>

      {/* ─── El problema ──────────────────────────── */}
      <section className="landing-block">
        <h2>El problema</h2>
        <p>
          Todos los días, decenas de miles de carros hacen Guarenas–Guatire a
          Caracas <strong>con tres y cuatro puestos vacíos</strong>. En el mismo
          camino, gente que va al mismo sitio espera un transporte que no
          aparece, o paga un viaje privado completo que no puede costear.
        </p>
        <p>
          El carro está. El viaje está. Lo que falta es quien los junte —
          y que el precio no se negocie a la ventana del carro.
        </p>
      </section>

      {/* ─── Cómo funciona ────────────────────────── */}
      <section className="landing-block">
        <h2>Cómo funciona</h2>
        <div className="how-grid">
          <div className="how-step">
            <span className="how-num">1</span>
            <strong>El conductor publica su ruta</strong>
            <p>
              La que ya hace todos los días. Dice a qué hora sale y cuántos
              puestos le sobran.
            </p>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <strong>Puestico calcula la tarifa</strong>
            <p>
              Por distancia y tiempo, con un mínimo y un máximo. El conductor
              elige dentro de esa banda, no pone lo que quiere.
            </p>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <strong>El pasajero reserva y paga</strong>
            <p>
              Ve el precio antes de montarse, quién lo lleva, la placa y la
              calificación. Nada de sorpresas.
            </p>
          </div>
          <div className="how-step">
            <span className="how-num">4</span>
            <strong>Viajan y se califican</strong>
            <p>
              Puestico se queda el {Math.round(FARE.commission_rate * 100)}% y el
              resto va al conductor.
            </p>
          </div>
        </div>
      </section>

      {/* ─── La tarifa, con un caso real ──────────── */}
      <section className="landing-block">
        <h2>La tarifa la pone la plataforma</h2>
        <p>
          Como Yummy o Ridery: el precio sale de una fórmula, no de una
          negociación. Ejemplo real de la ruta más pedida del corredor:
        </p>

        <div className="example-fare">
          <div className="example-head">
            <strong>Guatire → Chacaíto</strong>
            <span>
              {ruta.km} km · {ruta.minutes} min · hora pico
            </span>
          </div>
          <div className="row">
            <span>Cargo base</span>
            <span>${ruta.base.toFixed(2)}</span>
          </div>
          <div className="row">
            <span>
              Distancia · {ruta.km} km × ${FARE.per_km_usd.toFixed(2)}
            </span>
            <span>${ruta.distance.toFixed(2)}</span>
          </div>
          <div className="row">
            <span>
              Tiempo · {ruta.minutes} min × ${FARE.per_min_usd.toFixed(3)}
            </span>
            <span>${ruta.time.toFixed(2)}</span>
          </div>
          <div className="row row-total">
            <span>Precio del puesto</span>
            <span>${ruta.suggested.toFixed(2)}</span>
          </div>
          <div className="fare-compare standalone">
            <div>
              <strong>${ahorro.taxi.toFixed(2)}</strong>
              <small>viaje privado</small>
            </div>
            <div className="fare-compare-arrow">→</div>
            <div>
              <strong className="accent">${ruta.suggested.toFixed(2)}</strong>
              <small>tu puesto</small>
            </div>
            <div className="fare-compare-save">−{ahorro.percent}%</div>
          </div>
          <p className="note">
            Banda regulada para esta ruta: mínimo ${ruta.floor.toFixed(2)},
            máximo ${ruta.ceiling.toFixed(2)}. Fuera de ese rango, la app no
            permite publicar el viaje.
          </p>
        </div>
      </section>

      {/* ─── El negocio en una línea ──────────────── */}
      <section className="landing-block closing">
        <h2>El negocio</h2>
        <p className="closing-line">
          Puestico convierte los carros que ya están rodando en transporte
          disponible: el conductor cobra su ruta de siempre, el pasajero paga un
          puesto en vez de un viaje completo.
        </p>
        <div className="stack">
          <a className="btn btn-lg" href="/">Probar la app</a>
          <a className="btn btn-ghost" href="/metricas">
            Ver métricas del piloto
          </a>
        </div>
      </section>
    </main>
    <BottomNav current="buscar" />
    </>
  );
}
