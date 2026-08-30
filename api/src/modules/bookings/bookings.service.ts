import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { DbService } from '../../database/db.service';
import { ServiceUnavailableException } from '@nestjs/common';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats: number;
  status: BookingStatus;
  payment_id: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  refund_percentage: number | null;
  created_at: string;
}

/**
 * Lógica de reservas del recorrido P1 (pasajero).
 *
 * Reglas cubiertas:
 *  - Q10: dos pasajeros no pueden tomar el mismo puesto (control de concurrencia)
 *  - Q1-Q5: la cancelación aplica la política de reembolso correcta
 *  - Un pasajero no puede reservar su propio viaje
 *  - No se puede reservar un viaje que ya salió, está lleno o fue cancelado
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly db: DbService,
  ) {}

  private assertDb() {
    if (!this.db.isReady) {
      throw new ServiceUnavailableException(
        'La base de datos no está disponible',
      );
    }
  }

  /**
   * Valida que un viaje admita una reserva de N puestos.
   * Se separa de la persistencia para poder testearla sin base de datos.
   */
  validateBookingRequest(
    trip: {
      id: string;
      driver_id: string;
      status: string;
      seats_available: number;
      departure_at: Date;
    },
    passengerId: string,
    seats: number,
    now: Date = new Date(),
  ): void {
    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }
    if (trip.driver_id === passengerId) {
      throw new BadRequestException('No podés reservar tu propio viaje');
    }
    if (trip.status === 'cancelled') {
      throw new BadRequestException('El viaje fue cancelado');
    }
    if (trip.status === 'completed') {
      throw new BadRequestException('El viaje ya finalizó');
    }
    if (seats < 1) {
      throw new BadRequestException('Debés reservar al menos un puesto');
    }
    if (seats > trip.seats_available) {
      // Q10: el puesto ya fue tomado
      throw new ConflictException(
        `Solo quedan ${trip.seats_available} puesto(s) disponible(s)`,
      );
    }
    if (trip.departure_at.getTime() <= now.getTime()) {
      throw new BadRequestException('El viaje ya salió');
    }
  }

  /**
   * Calcula horas restantes hasta la salida — define la política de reembolso.
   */
  hoursUntilDeparture(departureAt: Date, now: Date = new Date()): number {
    return (departureAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Resuelve el reembolso de una cancelación según quién cancela y cuándo.
   * Q1-Q5 del plan de QA.
   */
  resolveCancellation(
    amountPaidUsd: number,
    cancelledBy: 'driver' | 'passenger',
    departureAt: Date,
    noShow = false,
    now: Date = new Date(),
  ): {
    policy: string;
    refund_amount: number;
    refund_percentage: number;
    compensation: boolean;
  } {
    const hours = this.hoursUntilDeparture(departureAt, now);
    const policy = this.paymentsService.determinePolicy(
      cancelledBy,
      hours,
      noShow,
    );
    const { refund_amount, refund_percentage } =
      this.paymentsService.calculateRefund(amountPaidUsd, policy);

    return {
      policy,
      refund_amount,
      refund_percentage,
      compensation: policy === 'DRIVER_NO_SHOW',
    };
  }

  /**
   * Verifica que quien cancela sea parte de la reserva.
   */
  assertCanCancel(
    booking: { passenger_id: string; status: BookingStatus },
    trip: { driver_id: string },
    actorId: string,
  ): 'driver' | 'passenger' {
    if (booking.status === 'cancelled') {
      throw new BadRequestException('La reserva ya estaba cancelada');
    }
    if (booking.status === 'completed') {
      throw new BadRequestException(
        'No se puede cancelar una reserva ya completada',
      );
    }
    if (actorId === booking.passenger_id) return 'passenger';
    if (actorId === trip.driver_id) return 'driver';
    throw new ForbiddenException('No participás en esta reserva');
  }

  // ─── Persistencia ──────────────────────────────────────────

  /**
   * Crear una reserva. Es la operación más delicada de la app: dos
   * personas pidiendo el último puesto a la vez.
   *
   * Cómo se resuelve, en orden:
   *  1. `SELECT ... FOR UPDATE` sobre la fila del viaje. La segunda
   *     transacción se queda esperando; NO lee un estado viejo. Sin
   *     esto, las dos leerían "queda 1" y las dos confirmarían.
   *  2. Las validaciones de negocio, que ya estaban probadas sin base
   *     de datos y se reutilizan tal cual.
   *  3. El INSERT, con el disparador de la migración 002 como última
   *     defensa: aunque alguien escriba directo en la base, no puede
   *     sobrevender.
   *  4. El pago se crea en la MISMA transacción. Si algo falla, no
   *     queda una reserva sin pago ni un pago sin reserva.
   */
  async create(input: {
    trip_id: string;
    passenger_id: string;
    seats?: number;
    method?: 'transfer_usd' | 'zelle' | 'pago_movil' | 'cash';
  }): Promise<any> {
    this.assertDb();
    const seats = input.seats && input.seats > 0 ? input.seats : 1;

    return this.db.transaction(async (client) => {
      const { rows: trips } = await client.query(
        `SELECT id, driver_id, status, seats_total, seats_available,
                price_per_seat_usd, price_per_seat_bs,
                (departure_date + departure_time) AS departure_at
           FROM trips
          WHERE id = $1
          FOR UPDATE`,
        [input.trip_id],
      );

      const trip = trips[0];
      if (!trip) throw new NotFoundException('El viaje no existe');

      this.validateBookingRequest(
        {
          id: trip.id,
          driver_id: trip.driver_id,
          status: trip.status,
          seats_available: Number(trip.seats_available),
          departure_at: new Date(trip.departure_at),
        },
        input.passenger_id,
        seats,
      );

      // Un mismo pasajero no puede tener dos reservas vivas en el
      // mismo viaje (lo garantiza también un índice, pero avisar acá
      // da un mensaje entendible en vez de un error de base).
      const { rows: dupes } = await client.query(
        `SELECT id FROM bookings
          WHERE trip_id = $1 AND passenger_id = $2
            AND status IN ('pending','confirmed')`,
        [input.trip_id, input.passenger_id],
      );
      if (dupes.length) {
        throw new ConflictException('Ya tenés una reserva en este viaje');
      }

      const { rows: created } = await client.query(
        `INSERT INTO bookings (trip_id, passenger_id, seats, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING *`,
        [input.trip_id, input.passenger_id, seats],
      );
      const booking = created[0];

      const breakdown = this.paymentsService.calculatePaymentBreakdown(
        Number(trip.price_per_seat_usd),
        seats,
      );

      const { rows: payments } = await client.query(
        `INSERT INTO payments (booking_id, amount_usd, amount_bs,
                               commission_usd, driver_amount_usd,
                               method, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [
          booking.id,
          breakdown.amount_usd,
          trip.price_per_seat_bs
            ? +(Number(trip.price_per_seat_bs) * seats).toFixed(2)
            : null,
          breakdown.commission_usd,
          breakdown.driver_amount_usd,
          input.method ?? 'pago_movil',
        ],
      );

      await client.query(
        `UPDATE bookings SET payment_id = $2, updated_at = NOW() WHERE id = $1`,
        [booking.id, payments[0].id],
      );

      return { ...booking, payment: payments[0] };
    });
  }

  /** Confirmar el pago: la reserva pasa a confirmada. */
  async confirmPayment(
    bookingId: string,
    reference: string,
    confirmedBy: string,
  ): Promise<any> {
    this.assertDb();

    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT b.id, b.status, b.payment_id
           FROM bookings b WHERE b.id = $1 FOR UPDATE`,
        [bookingId],
      );
      const booking = rows[0];
      if (!booking) throw new NotFoundException('La reserva no existe');
      if (booking.status !== 'pending') {
        throw new BadRequestException(
          `La reserva está ${booking.status}, no se puede confirmar el pago`,
        );
      }

      await client.query(
        `UPDATE payments
            SET status = 'confirmed', reference = $2,
                confirmed_by = $3, confirmed_at = NOW()
          WHERE id = $1`,
        [booking.payment_id, reference, confirmedBy],
      );

      const { rows: updated } = await client.query(
        `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
          WHERE id = $1 RETURNING *`,
        [bookingId],
      );
      return updated[0];
    });
  }

  /**
   * Cancelar una reserva aplicando la política real de reembolso.
   * El cálculo ya estaba probado; acá se persiste.
   */
  async cancel(
    bookingId: string,
    actorId: string,
    reason?: string,
    noShow = false,
  ): Promise<any> {
    this.assertDb();

    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT b.id, b.status, b.passenger_id, b.trip_id,
                t.driver_id,
                (t.departure_date + t.departure_time) AS departure_at,
                COALESCE(p.amount_usd, 0) AS amount_paid
           FROM bookings b
           JOIN trips t ON t.id = b.trip_id
           LEFT JOIN payments p ON p.id = b.payment_id
          WHERE b.id = $1
          FOR UPDATE OF b`,
        [bookingId],
      );
      const booking = rows[0];
      if (!booking) throw new NotFoundException('La reserva no existe');

      const cancelledBy = this.assertCanCancel(
        { passenger_id: booking.passenger_id, status: booking.status },
        { driver_id: booking.driver_id },
        actorId,
      );

      const resolution = this.resolveCancellation(
        Number(booking.amount_paid),
        cancelledBy,
        new Date(booking.departure_at),
        noShow,
      );

      const { rows: updated } = await client.query(
        `UPDATE bookings
            SET status = 'cancelled',
                cancellation_reason = $2,
                refund_amount = $3,
                refund_percentage = $4,
                updated_at = NOW()
          WHERE id = $1
        RETURNING *`,
        [
          bookingId,
          reason ?? resolution.policy,
          resolution.refund_amount,
          resolution.refund_percentage,
        ],
      );

      if (resolution.refund_amount > 0) {
        await client.query(
          `UPDATE payments SET status = 'refunded' WHERE booking_id = $1`,
          [bookingId],
        );
      }

      return { ...updated[0], ...resolution };
    });
  }

  /** Las reservas de un pasajero — su pantalla "Mis viajes". */
  async findByPassenger(passengerId: string): Promise<any[]> {
    this.assertDb();
    return this.db.query(
      `SELECT b.id, b.seats, b.status, b.refund_amount, b.created_at,
              t.id AS trip_id, t.origin, t.destination,
              t.departure_date, t.departure_time, t.status AS trip_status,
              t.price_per_seat_usd,
              u.name AS driver_name, u.rating AS driver_rating,
              v.model AS vehicle_model, v.plate AS vehicle_plate,
              p.amount_usd, p.status AS payment_status, p.method
         FROM bookings b
         JOIN trips t ON t.id = b.trip_id
         JOIN users u ON u.id = t.driver_id
         LEFT JOIN vehicles v ON v.id = t.vehicle_id
         LEFT JOIN payments p ON p.id = b.payment_id
        WHERE b.passenger_id = $1
        ORDER BY t.departure_date DESC, t.departure_time DESC
        LIMIT 100`,
      [passengerId],
    );
  }

  /** Las solicitudes que le llegan a un conductor. */
  async findByDriver(driverId: string, status?: string): Promise<any[]> {
    this.assertDb();
    const params: unknown[] = [driverId];
    let filter = '';
    if (status) {
      params.push(status);
      filter = ` AND b.status = $2`;
    }
    return this.db.query(
      `SELECT b.id, b.seats, b.status, b.created_at,
              t.id AS trip_id, t.origin, t.destination,
              t.departure_date, t.departure_time,
              u.name AS passenger_name, u.rating AS passenger_rating,
              p.amount_usd, p.driver_amount_usd, p.status AS payment_status
         FROM bookings b
         JOIN trips t ON t.id = b.trip_id
         JOIN users u ON u.id = b.passenger_id
         LEFT JOIN payments p ON p.id = b.payment_id
        WHERE t.driver_id = $1 ${filter}
        ORDER BY b.created_at DESC
        LIMIT 100`,
      params,
    );
  }
}
