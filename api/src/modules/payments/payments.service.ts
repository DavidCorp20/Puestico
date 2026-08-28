import { Injectable } from '@nestjs/common';

/**
 * Constantes de negocio — Comisión de plataforma
 */
export const COMMISSION_RATE = 0.15; // 15%

/**
 * Políticas de cancelación / reembolso (§24.3 del doc maestro)
 */
export const CANCELLATION_POLICIES = {
  DRIVER_CANCELS_BEFORE_TRIP: { refund: 1.0, label: 'Conductor cancela antes del viaje → 100% reembolso' },
  PASSENGER_CANCELS_GT_2H: { refund: 1.0, label: 'Pasajero cancela >2h antes → 100% reembolso' },
  PASSENGER_CANCELS_LT_2H: { refund: 0.5, label: 'Pasajero cancela <2h antes → 50% reembolso' },
  PASSENGER_NO_SHOW: { refund: 0.0, label: 'No-show pasajero → sin reembolso' },
  DRIVER_NO_SHOW: { refund: 1.0, compensation: true, label: 'No-show conductor → 100% reembolso + compensación' },
} as const;

export interface PaymentBreakdown {
  amount_usd: number;
  commission_usd: number;
  driver_amount_usd: number;
}

@Injectable()
export class PaymentsService {
  /**
   * Calcula el desglose de pago con comisión del 15%.
   *
   * Ejemplo (Q6 del plan QA):
   *   precio = USD 8, 3 puestos
   *   total = USD 24
   *   comisión = USD 3.60 (15%)
   *   conductor = USD 20.40
   */
  calculatePaymentBreakdown(pricePerSeatUsd: number, seats: number): PaymentBreakdown {
    const amount_usd = +(pricePerSeatUsd * seats).toFixed(2);
    const commission_usd = +(amount_usd * COMMISSION_RATE).toFixed(2);
    const driver_amount_usd = +(amount_usd - commission_usd).toFixed(2);
    return { amount_usd, commission_usd, driver_amount_usd };
  }

  /**
   * Calcula el monto de reembolso según la política de cancelación.
   *
   * @param amountUsd - Monto pagado en USD
   * @param policy - Tipo de política (ver CANCELLATION_POLICIES)
   * @returns { refund_amount, refund_percentage }
   */
  calculateRefund(
    amountUsd: number,
    policy: keyof typeof CANCELLATION_POLICIES,
  ): { refund_amount: number; refund_percentage: number } {
    const policyConfig = CANCELLATION_POLICIES[policy];
    const refund_amount = +(amountUsd * policyConfig.refund).toFixed(2);
    const refund_percentage = Math.round(policyConfig.refund * 100);
    return { refund_amount, refund_percentage };
  }

  /**
   * Determina la política de cancelación aplicable.
   *
   * @param cancelledBy - 'driver' | 'passenger'
   * @param hoursBeforeTrip - Horas faltantes para la salida
   * @param noShow - Si fue no-show
   */
  determinePolicy(
    cancelledBy: 'driver' | 'passenger',
    hoursBeforeTrip: number,
    noShow: boolean = false,
  ): keyof typeof CANCELLATION_POLICIES {
    if (noShow) {
      return cancelledBy === 'driver' ? 'DRIVER_NO_SHOW' : 'PASSENGER_NO_SHOW';
    }
    if (cancelledBy === 'driver') {
      return 'DRIVER_CANCELS_BEFORE_TRIP';
    }
    return hoursBeforeTrip >= 2 ? 'PASSENGER_CANCELS_GT_2H' : 'PASSENGER_CANCELS_LT_2H';
  }
}
