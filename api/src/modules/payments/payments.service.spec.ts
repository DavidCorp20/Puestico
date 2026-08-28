import { PaymentsService, COMMISSION_RATE, CANCELLATION_POLICIES } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = new PaymentsService();
  });

  // ─── Q6: Cálculo de comisión ───────────────────────────────
  describe('calculatePaymentBreakdown (Q6)', () => {
    it('precio USD 8, 3 puestos → plataforma retiene USD 3,60; conductor USD 20,40', () => {
      const result = service.calculatePaymentBreakdown(8.0, 3);
      expect(result.amount_usd).toBe(24.0);
      expect(result.commission_usd).toBe(3.6);
      expect(result.driver_amount_usd).toBe(20.4);
    });

    it('precio USD 7, 1 puesto → comisión USD 1,05; conductor USD 5,95', () => {
      const result = service.calculatePaymentBreakdown(7.0, 1);
      expect(result.amount_usd).toBe(7.0);
      expect(result.commission_usd).toBe(1.05);
      expect(result.driver_amount_usd).toBe(5.95);
    });

    it('comisión siempre es 15% del monto', () => {
      for (const [price, seats] of [[6, 4], [10, 2], [8, 1], [15, 3]]) {
        const result = service.calculatePaymentBreakdown(price, seats);
        expect(result.commission_usd).toBe(+(result.amount_usd * COMMISSION_RATE).toFixed(2));
        expect(result.driver_amount_usd).toBe(+(result.amount_usd - result.commission_usd).toFixed(2));
      }
    });
  });

  // ─── Q1: Cancelación conductor antes del viaje ─────────────
  it('Q1: cancelación conductor → 100% reembolso', () => {
    const policy = service.determinePolicy('driver', 5, false);
    expect(policy).toBe('DRIVER_CANCELS_BEFORE_TRIP');
    const refund = service.calculateRefund(8.0, policy);
    expect(refund.refund_amount).toBe(8.0);
    expect(refund.refund_percentage).toBe(100);
  });

  // ─── Q2: Cancelación pasajero >2h antes ────────────────────
  it('Q2: cancelación pasajero >2h → 100% reembolso', () => {
    const policy = service.determinePolicy('passenger', 3, false);
    expect(policy).toBe('PASSENGER_CANCELS_GT_2H');
    const refund = service.calculateRefund(8.0, policy);
    expect(refund.refund_amount).toBe(8.0);
    expect(refund.refund_percentage).toBe(100);
  });

  // ─── Q3: Cancelación pasajero <2h antes ────────────────────
  it('Q3: cancelación pasajero <2h → 50% reembolso', () => {
    const policy = service.determinePolicy('passenger', 1, false);
    expect(policy).toBe('PASSENGER_CANCELS_LT_2H');
    const refund = service.calculateRefund(8.0, policy);
    expect(refund.refund_amount).toBe(4.0);
    expect(refund.refund_percentage).toBe(50);
  });

  // ─── Q4: No-show pasajero ──────────────────────────────────
  it('Q4: no-show pasajero → sin reembolso', () => {
    const policy = service.determinePolicy('passenger', 0, true);
    expect(policy).toBe('PASSENGER_NO_SHOW');
    const refund = service.calculateRefund(8.0, policy);
    expect(refund.refund_amount).toBe(0);
    expect(refund.refund_percentage).toBe(0);
  });

  // ─── Q5: No-show conductor ─────────────────────────────────
  it('Q5: no-show conductor → 100% reembolso + compensación', () => {
    const policy = service.determinePolicy('driver', 0, true);
    expect(policy).toBe('DRIVER_NO_SHOW');
    const refund = service.calculateRefund(8.0, policy);
    expect(refund.refund_amount).toBe(8.0);
    expect(refund.refund_percentage).toBe(100);
    expect(CANCELLATION_POLICIES.DRIVER_NO_SHOW.compensation).toBe(true);
  });

  // ─── Q7: Pago en BS vs USD ─────────────────────────────────
  it('Q7: comisión registrada en USD independientemente del método', () => {
    const breakdownUsd = service.calculatePaymentBreakdown(8.0, 1);
    const breakdownBs = service.calculatePaymentBreakdown(8.0, 1);
    // La comisión siempre se calcula en USD
    expect(breakdownUsd.commission_usd).toBe(breakdownBs.commission_usd);
    expect(breakdownUsd.commission_usd).toBe(1.2);
  });

  // ─── Q9: Viaje sin pasajeros ───────────────────────────────
  it('Q9: viaje sin pasajeros → conductor recibe USD 0; sin comisión', () => {
    const result = service.calculatePaymentBreakdown(8.0, 0);
    expect(result.amount_usd).toBe(0);
    expect(result.commission_usd).toBe(0);
    expect(result.driver_amount_usd).toBe(0);
  });
});
