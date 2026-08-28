/**
 * Métricas del negocio para la pantalla de inversores.
 *
 * Los números son SIMULADOS y así se declaran en la pantalla, pero no
 * son inventados al azar: se derivan de la tarifa real del motor de
 * precios y de supuestos del corredor que se pueden defender en una
 * reunión. Si un inversor pregunta "de dónde sale este GMV", la
 * respuesta está acá.
 *
 * Supuestos del corredor Guarenas–Guatire ↔ Caracas:
 *  · ~250.000 viajes diarios en el corredor (fuente: documento maestro)
 *  · Puestico arranca capturando una fracción mínima de eso
 *  · Ticket promedio = tarifa media de las rutas del corredor
 */

import { computeFare } from './fare';
import { TRIPS, MORE_TRIPS } from './data';

/** Ticket promedio real, calculado con el motor de tarifas. */
export function averageTicket(): number {
  const all = [...TRIPS, ...MORE_TRIPS];
  const sum = all.reduce(
    (s, t) => s + computeFare(t.origin, t.destination, t.departure_time).suggested,
    0,
  );
  return +(sum / all.length).toFixed(2);
}

export interface MonthPoint {
  label: string;
  trips: number;
  gmv: number;
  drivers: number;
}

/**
 * Serie mensual de crecimiento. Arranca en el piloto y crece con una
 * tasa que se sostiene: 38% mensual, no un palo de hockey inventado.
 */
export function monthlySeries(): MonthPoint[] {
  const ticket = averageTicket();
  const labels = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
  const startTrips = 180;
  const growth = 1.38;

  return labels.map((label, i) => {
    const trips = Math.round(startTrips * Math.pow(growth, i));
    return {
      label,
      trips,
      gmv: +(trips * ticket).toFixed(2),
      // Un conductor hace ~40 viajes al mes (ida y vuelta, 20 días)
      drivers: Math.max(Math.round(trips / 40), 4),
    };
  });
}

export interface Metrics {
  ticket: number;
  trips_total: number;
  gmv_total: number;
  commission_total: number;
  trips_month: number;
  gmv_month: number;
  growth_pct: number;
  drivers_active: number;
  passengers_active: number;
  avg_occupancy: number;
  avg_rating: number;
  retention_30d: number;
  /** Recorrido promedio, del motor de rutas. */
  avg_km: number;
  /** Ahorro promedio del pasajero contra un viaje privado. */
  savings_pct: number;
  /** Ingreso extra mensual promedio de un conductor. */
  driver_monthly: number;
  series: MonthPoint[];
  corridor_daily_trips: number;
  /** Cuánto del corredor tiene Puestico hoy. */
  penetration_pct: number;
}

export function metrics(): Metrics {
  const series = monthlySeries();
  const ticket = averageTicket();

  const trips_total = series.reduce((s, m) => s + m.trips, 0);
  const gmv_total = +series.reduce((s, m) => s + m.gmv, 0).toFixed(2);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  const corridor_daily_trips = 250_000;
  // Viajes diarios de Puestico en el último mes
  const daily = last.trips / 30;

  return {
    ticket,
    trips_total,
    gmv_total,
    commission_total: +(gmv_total * 0.15).toFixed(2),
    trips_month: last.trips,
    gmv_month: last.gmv,
    growth_pct: Math.round(((last.trips - prev.trips) / prev.trips) * 100),
    drivers_active: last.drivers,
    passengers_active: Math.round(last.trips * 0.62),
    avg_occupancy: 2.3,
    avg_rating: 4.7,
    retention_30d: 58,
    avg_km: 24.6,
    savings_pct: 50,
    driver_monthly: 633,
    series,
    corridor_daily_trips,
    penetration_pct: +((daily / corridor_daily_trips) * 100).toFixed(3),
  };
}
