import { metrics } from '../../lib/metrics';
import { FARE } from '../../lib/fare';
import GrowthChart from './GrowthChart';
import TopBar from '../TopBar';
import BottomNav from '../BottomNav';

export const metadata = {
  title: 'Puestico — Métricas del negocio',
};

function money(n: number): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function Metricas() {
  const m = metrics();

  return (
    <>
      <TopBar title="El negocio" back="/inicio" />
      <main className="screen" id="contenido">
      <div className="greet">
        <h1 className="greet-title">Métricas del piloto</h1>
        <p className="greet-sub">
          Corredor Guarenas–Guatire ↔ Caracas, últimos 6 meses.
        </p>
      </div>

      <div className="alert alert-warn">
        <strong>Datos simulados del piloto</strong>
        Las cifras están proyectadas con la tarifa real del motor de precios y
        los supuestos del corredor. No son operación en vivo — lo aclaramos
        porque un número sin origen no sirve para decidir.
      </div>

      {/* ─── Los tres números que importan ──────────── */}
      <div className="kpi-grid">
        <div className="kpi kpi-lead">
          <span className="kpi-label">GMV acumulado</span>
          <strong>${money(m.gmv_total)}</strong>
          <small>volumen transado en 6 meses</small>
        </div>
        <div className="kpi">
          <span className="kpi-label">Ingreso de Puestico</span>
          <strong>${money(m.commission_total)}</strong>
          <small>comisión del {Math.round(FARE.commission_rate * 100)}%</small>
        </div>
        <div className="kpi">
          <span className="kpi-label">Viajes completados</span>
          <strong>{money(m.trips_total)}</strong>
          <small>{money(m.trips_month)} solo el último mes</small>
        </div>
      </div>

      <div className="growth-strip">
        <div>
          <strong>+{m.growth_pct}%</strong>
          <span>crecimiento mensual de viajes</span>
        </div>
        <div>
          <strong>${m.ticket.toFixed(2)}</strong>
          <span>ticket promedio por puesto</span>
        </div>
        <div>
          <strong>{m.avg_occupancy}</strong>
          <span>puestos vendidos por viaje</span>
        </div>
      </div>

      <div className="card">
        <h2>Crecimiento mensual</h2>
        <GrowthChart series={m.series} />
      </div>

      {/* ─── Unit economics ─────────────────────────── */}
      <div className="card">
        <h2>Economía de un viaje</h2>
        <p className="fare-intro">
          Recorrido promedio de {m.avg_km} km en el corredor.
        </p>
        <div className="row">
          <span>Precio del puesto</span>
          <span>${m.ticket.toFixed(2)}</span>
        </div>
        <div className="row">
          <span>Puestos por viaje</span>
          <span>{m.avg_occupancy}</span>
        </div>
        <div className="row">
          <span>Ingreso bruto del viaje</span>
          <span>${(m.ticket * m.avg_occupancy).toFixed(2)}</span>
        </div>
        <div className="row row-total">
          <span>Se queda Puestico ({Math.round(FARE.commission_rate * 100)}%)</span>
          <span>${(m.ticket * m.avg_occupancy * 0.15).toFixed(2)}</span>
        </div>
        <p className="note">
          Sin flota, sin sueldos de conductores y sin costo de combustible: el
          carro y el viaje ya existían. El costo marginal por viaje es la
          pasarela de pago.
        </p>
      </div>

      {/* ─── Los dos lados del mercado ──────────────── */}
      <h2 className="section-h">Por qué se queda cada lado</h2>

      <div className="two-col">
        <div className="card side-card">
          <span className="side-tag">Conductor</span>
          <div className="side-number">${money(m.driver_monthly)}</div>
          <p className="side-text">
            de ingreso extra al mes haciendo la ruta que ya hacía, ida y vuelta,
            22 días hábiles. No cambia de trabajo ni maneja horas de más:
            monetiza los puestos vacíos del viaje que igual iba a hacer.
          </p>
          <div className="row">
            <span>Comisión Puestico</span>
            <span>15%</span>
          </div>
          <div className="row">
            <span>Apps de viaje privado</span>
            <span className="muted-strike">20% – 25%</span>
          </div>
        </div>

        <div className="card side-card">
          <span className="side-tag">Pasajero</span>
          <div className="side-number">−{m.savings_pct}%</div>
          <p className="side-text">
            paga contra un viaje privado por la misma ruta, con tarifa calculada
            por distancia y no negociada en la calle. Sabe el precio antes de
            montarse y el conductor está verificado.
          </p>
          <div className="row">
            <span>Retención a 30 días</span>
            <span>{m.retention_30d}%</span>
          </div>
          <div className="row">
            <span>Calificación promedio</span>
            <span>{m.avg_rating} / 5</span>
          </div>
        </div>
      </div>

      {/* ─── Tamaño del mercado ─────────────────────── */}
      <div className="card">
        <h2>Cuánto queda por tomar</h2>
        <div className="row">
          <span>Viajes diarios en el corredor</span>
          <span>{money(m.corridor_daily_trips)}</span>
        </div>
        <div className="row">
          <span>Viajes diarios de Puestico hoy</span>
          <span>{Math.round(m.trips_month / 30)}</span>
        </div>
        <div className="row row-total">
          <span>Penetración actual</span>
          <span>{m.penetration_pct}%</span>
        </div>
        <p className="note">
          El corredor mueve {money(m.corridor_daily_trips)} viajes por día y
          Puestico toca una fracción mínima. El crecimiento no depende de
          convencer a un mercado nuevo: los viajes ya se hacen todos los días,
          en carros con puestos vacíos.
        </p>
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        <a className="btn" href="/">Probar la app</a>
        <a className="btn btn-ghost" href="/inicio">Ver la propuesta</a>
      </div>
      </main>
      <BottomNav current="metricas" />
    </>
  );
}
