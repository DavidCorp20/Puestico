import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';

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
  constructor(private readonly paymentsService: PaymentsService) {}

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

  // ─── Persistencia (pendiente de repositorio TypeORM) ───────
  async create(): Promise<Booking> {
    throw new Error('TODO: persistir reserva en transacción con SELECT FOR UPDATE');
  }
}
