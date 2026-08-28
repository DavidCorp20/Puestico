import { BookingsService } from './bookings.service';
import { PaymentsService } from '../payments/payments.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

describe('BookingsService — recorrido P1 (pasajero)', () => {
  let service: BookingsService;
  const NOW = new Date('2026-09-01T00:00:00Z');

  const trip = (over: Partial<any> = {}) => ({
    id: 't1',
    driver_id: 'driver-1',
    status: 'scheduled',
    seats_available: 3,
    departure_at: new Date('2026-09-01T10:00:00Z'),
    ...over,
  });

  beforeEach(() => {
    service = new BookingsService(new PaymentsService());
  });

  // ─── Validación de reserva ─────────────────────────────────
  describe('validateBookingRequest', () => {
    it('acepta una reserva válida', () => {
      expect(() =>
        service.validateBookingRequest(trip(), 'passenger-1', 1, NOW),
      ).not.toThrow();
    });

    it('Q10: rechaza si pide más puestos de los disponibles', () => {
      expect(() =>
        service.validateBookingRequest(
          trip({ seats_available: 1 }),
          'passenger-1',
          2,
          NOW,
        ),
      ).toThrow(ConflictException);
    });

    it('Q10: rechaza cuando el viaje ya está lleno', () => {
      expect(() =>
        service.validateBookingRequest(
          trip({ seats_available: 0 }),
          'passenger-1',
          1,
          NOW,
        ),
      ).toThrow(ConflictException);
    });

    it('el conductor no puede reservar su propio viaje', () => {
      expect(() =>
        service.validateBookingRequest(trip(), 'driver-1', 1, NOW),
      ).toThrow(BadRequestException);
    });

    it('rechaza un viaje cancelado', () => {
      expect(() =>
        service.validateBookingRequest(
          trip({ status: 'cancelled' }),
          'passenger-1',
          1,
          NOW,
        ),
      ).toThrow(BadRequestException);
    });

    it('rechaza un viaje que ya salió', () => {
      expect(() =>
        service.validateBookingRequest(
          trip({ departure_at: new Date('2026-08-31T10:00:00Z') }),
          'passenger-1',
          1,
          NOW,
        ),
      ).toThrow(BadRequestException);
    });

    it('rechaza cero puestos', () => {
      expect(() =>
        service.validateBookingRequest(trip(), 'passenger-1', 0, NOW),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Políticas de cancelación Q1-Q5 ────────────────────────
  describe('resolveCancellation', () => {
    it('Q1: cancela el conductor → 100% reembolso', () => {
      const r = service.resolveCancellation(
        8,
        'driver',
        new Date('2026-09-01T10:00:00Z'),
        false,
        NOW,
      );
      expect(r.refund_percentage).toBe(100);
      expect(r.refund_amount).toBe(8);
    });

    it('Q2: pasajero cancela con 10h de anticipación → 100%', () => {
      const r = service.resolveCancellation(
        8,
        'passenger',
        new Date('2026-09-01T10:00:00Z'),
        false,
        NOW,
      );
      expect(r.refund_percentage).toBe(100);
      expect(r.refund_amount).toBe(8);
    });

    it('Q3: pasajero cancela con 1h de anticipación → 50%', () => {
      const r = service.resolveCancellation(
        8,
        'passenger',
        new Date('2026-09-01T01:00:00Z'),
        false,
        NOW,
      );
      expect(r.refund_percentage).toBe(50);
      expect(r.refund_amount).toBe(4);
    });

    it('Q3: el límite exacto de 2h todavía reembolsa 100%', () => {
      const r = service.resolveCancellation(
        8,
        'passenger',
        new Date('2026-09-01T02:00:00Z'),
        false,
        NOW,
      );
      expect(r.refund_percentage).toBe(100);
    });

    it('Q4: no-show del pasajero → sin reembolso', () => {
      const r = service.resolveCancellation(
        8,
        'passenger',
        new Date('2026-09-01T10:00:00Z'),
        true,
        NOW,
      );
      expect(r.refund_percentage).toBe(0);
      expect(r.refund_amount).toBe(0);
    });

    it('Q5: no-show del conductor → 100% + compensación', () => {
      const r = service.resolveCancellation(
        8,
        'driver',
        new Date('2026-09-01T10:00:00Z'),
        true,
        NOW,
      );
      expect(r.refund_percentage).toBe(100);
      expect(r.compensation).toBe(true);
    });
  });

  // ─── Permisos de cancelación ───────────────────────────────
  describe('assertCanCancel', () => {
    const booking = { passenger_id: 'passenger-1', status: 'confirmed' as const };

    it('el pasajero puede cancelar su reserva', () => {
      expect(
        service.assertCanCancel(booking, { driver_id: 'driver-1' }, 'passenger-1'),
      ).toBe('passenger');
    });

    it('el conductor puede cancelar la reserva', () => {
      expect(
        service.assertCanCancel(booking, { driver_id: 'driver-1' }, 'driver-1'),
      ).toBe('driver');
    });

    it('un tercero no puede cancelar', () => {
      expect(() =>
        service.assertCanCancel(booking, { driver_id: 'driver-1' }, 'otro'),
      ).toThrow(ForbiddenException);
    });

    it('no se puede cancelar dos veces', () => {
      expect(() =>
        service.assertCanCancel(
          { passenger_id: 'passenger-1', status: 'cancelled' },
          { driver_id: 'driver-1' },
          'passenger-1',
        ),
      ).toThrow(BadRequestException);
    });
  });

  // ─── Cálculo de horas ──────────────────────────────────────
  it('hoursUntilDeparture calcula bien las horas restantes', () => {
    expect(
      service.hoursUntilDeparture(new Date('2026-09-01T06:30:00Z'), NOW),
    ).toBe(6.5);
  });
});
