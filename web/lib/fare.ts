/**
 * Tarifa regulada por distancia — el motor de precios de Puestico.
 *
 * El modelo es el mismo que usan Yummy y Ridery: la plataforma calcula
 * la tarifa, no el conductor. Pero acá hay una diferencia de fondo que
 * define el producto: en un carpooling el conductor YA iba a hacer ese
 * viaje. No cobra el traslado, cobra compartir el carro. Por eso la
 * tarifa por puesto es una fracción del costo del recorrido y baja
 * cuando se llenan más puestos.
 *
 * Los dos lados que pidió David:
 *  · conductor → ingreso extra: la banda garantiza que cubra combustible
 *    y desgaste, nunca por debajo del piso.
 *  · pasajero → precio accesible: la banda superior le pone techo, y
 *    siempre paga menos que un taxi por la misma ruta.
 */

import { buildRoute, routeDistanceKm, routeDuration } from './route';

/**
 * Parámetros de la tarifa. Están acá, en un solo lugar y con nombre,
 * porque son la palanca de negocio: se ajustan sin tocar la app.
 *
 * Calibrados para el corredor Guatire–Caracas, en dólares, con
 * gasolina de referencia a USD 0,50/litro y consumo de 10 km/litro.
 */
export const FARE = {
  /** Cargo fijo por puesto: cubre el desvío y la espera del conductor. */
  base_usd: 0.8,
  /** Por kilómetro recorrido. */
  per_km_usd: 0.11,
  /** Por minuto de viaje: castiga el tráfico, que es el costo real en Caracas. */
  per_min_usd: 0.02,
  /** Nunca se cobra menos que esto por un puesto. */
  min_usd: 1.5,
  /** Ni más que esto, por más largo que sea el recorrido. */
  max_usd: 12.0,
  /**
   * Descuento por puesto adicional: el carro ya va, así que el segundo
   * puesto le cuesta casi nada al conductor. 6% por puesto extra,
   * hasta 18%.
   */
  multi_seat_discount: 0.06,
  max_multi_seat_discount: 0.18,
  /** Comisión de la plataforma — la misma del backend. */
  commission_rate: 0.15,
  /**
   * Cuánto puede moverse el conductor respecto de la tarifa sugerida.
   * No es libre: es una banda. ±15%.
   */
  band: 0.15,
  /**
   * Referencia de mercado para poder mostrar el ahorro.
   * Un taxi/app de viaje privado en el corredor cobra ~2,6x por km.
   */
  taxi_multiplier: 3.0,
  /** Recargo de hora pico, en los tramos donde el tráfico se duplica. */
  peak_surcharge: 0.1,
} as const;

export interface FareBreakdown {
  km: number;
  minutes: number;
  /** Componentes, para poder mostrarle al usuario de dónde sale el número. */
  base: number;
  distance: number;
  time: number;
  /** Tarifa antes de recortar por la banda mínima/máxima. */
  raw: number;
  /** Tarifa sugerida por puesto, ya redondeada y dentro de la banda. */
  suggested: number;
  /** Piso y techo que la plataforma le permite al conductor. */
  floor: number;
  ceiling: number;
  /** Si se aplicó el mínimo o el máximo regulado. */
  clamped: 'min' | 'max' | null;
  /** Qué pagaría por un viaje privado en la misma ruta. */
  taxi_reference: number;
  peak: boolean;
}

/** Redondea a los 0,25 más cercanos: precios que se pueden pagar en efectivo. */
function round25(n: number): number {
  return Math.round(n * 4) / 4;
}

/** ¿La hora de salida cae en hora pico del corredor? */
export function isPeakHour(time: string): boolean {
  const h = Number(time.slice(0, 2));
  // Mañana hacia Caracas y tarde de vuelta: los dos picos reales del corredor
  return (h >= 5 && h < 9) || (h >= 16 && h < 20);
}

/**
 * Calcula la tarifa de un puesto para una ruta.
 *
 * `departureTime` es opcional: si viene, se evalúa la hora pico.
 */
export function computeFare(
  origin: string,
  destination: string,
  departureTime?: string,
): FareBreakdown {
  const route = buildRoute(origin, destination);
  const km = routeDistanceKm(route);
  const minutes = routeDuration(route);

  const peak = departureTime ? isPeakHour(departureTime) : false;

  const base = FARE.base_usd;
  const distance = +(km * FARE.per_km_usd).toFixed(2);
  const time = +(minutes * FARE.per_min_usd).toFixed(2);

  let raw = base + distance + time;
  if (peak) raw *= 1 + FARE.peak_surcharge;
  raw = +raw.toFixed(2);

  // La banda regulada: ni regalado ni abusivo
  let suggested = round25(raw);
  let clamped: 'min' | 'max' | null = null;
  if (suggested < FARE.min_usd) {
    suggested = FARE.min_usd;
    clamped = 'min';
  } else if (suggested > FARE.max_usd) {
    suggested = FARE.max_usd;
    clamped = 'max';
  }

  return {
    km,
    minutes,
    base,
    distance,
    time,
    raw,
    suggested,
    floor: round25(suggested * (1 - FARE.band)),
    ceiling: round25(suggested * (1 + FARE.band)),
    clamped,
    taxi_reference: round25(km * FARE.per_km_usd * FARE.taxi_multiplier + 2),
    peak,
  };
}

/**
 * Precio final de una reserva de N puestos, con el descuento por
 * puesto adicional. Devuelve también el desglose de la comisión.
 */
export function quote(pricePerSeat: number, seats: number) {
  const n = Math.max(1, Math.floor(seats));
  const discountRate = Math.min(
    (n - 1) * FARE.multi_seat_discount,
    FARE.max_multi_seat_discount,
  );

  const gross = +(pricePerSeat * n).toFixed(2);
  const discount = +(gross * discountRate).toFixed(2);
  const total = +(gross - discount).toFixed(2);
  const commission = +(total * FARE.commission_rate).toFixed(2);
  const driverAmount = +(total - commission).toFixed(2);

  return {
    seats: n,
    price_per_seat: pricePerSeat,
    gross,
    discount_rate: discountRate,
    discount,
    total,
    commission,
    driverAmount,
    /** Precio efectivo por puesto una vez aplicado el descuento. */
    effective_per_seat: +(total / n).toFixed(2),
  };
}

/**
 * Valida el precio que quiere poner un conductor contra la banda.
 * La plataforma no le impone el número, pero sí el rango.
 */
export function validatePrice(
  price: number,
  fare: FareBreakdown,
): { ok: boolean; reason?: string; level?: 'low' | 'high' | 'fair' } {
  if (!(price > 0)) {
    return { ok: false, reason: 'El precio debe ser mayor a cero.' };
  }
  if (price < fare.floor) {
    return {
      ok: false,
      level: 'low',
      reason: `Muy bajo para ${fare.km} km. El mínimo regulado es $${fare.floor.toFixed(2)} — por debajo de eso no cubres la gasolina.`,
    };
  }
  if (price > fare.ceiling) {
    return {
      ok: false,
      level: 'high',
      reason: `Muy alto para ${fare.km} km. El máximo regulado es $${fare.ceiling.toFixed(2)} — más que eso y el pasajero se va en taxi.`,
    };
  }
  return { ok: true, level: 'fair' };
}

/**
 * Ingreso estimado del conductor por hacer una ruta que ya hacía.
 * Es el número que le importa: cuánto le queda en el bolsillo.
 */
export function driverEarnings(
  pricePerSeat: number,
  seats: number,
  km: number,
) {
  const q = quote(pricePerSeat, seats);
  // Costo de combustible: 10 km/litro a USD 0,50/litro
  const fuel = +((km / 10) * 0.5).toFixed(2);
  return {
    ...q,
    fuel,
    /** Lo que gana de verdad, descontando lo que le cuesta el viaje. */
    net: +(q.driverAmount - fuel).toFixed(2),
    /** Por mes, haciendo la ruta ida y vuelta 22 días hábiles. */
    monthly: +((q.driverAmount - fuel) * 2 * 22).toFixed(2),
  };
}

/** Ahorro del pasajero contra un viaje privado. */
export function passengerSavings(pricePerSeat: number, fare: FareBreakdown) {
  const saved = +(fare.taxi_reference - pricePerSeat).toFixed(2);
  return {
    taxi: fare.taxi_reference,
    price: pricePerSeat,
    saved: Math.max(saved, 0),
    percent: Math.max(Math.round((saved / fare.taxi_reference) * 100), 0),
  };
}
