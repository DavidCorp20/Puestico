import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsEnum, IsBoolean, Min } from 'class-validator';
import { BookingsService } from './bookings.service';

class BookingCreateDto {
  @IsString() trip_id: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
  @IsOptional()
  @IsEnum(['transfer_usd', 'zelle', 'pago_movil', 'cash'])
  method?: 'transfer_usd' | 'zelle' | 'pago_movil' | 'cash';
}

class BookingCancelDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsBoolean() no_show?: boolean;
}

class PaymentConfirmDto {
  @IsString() reference: string;
}

/**
 * Reservas.
 *
 * Regla que se repite en todos los métodos: **el actor sale del token,
 * nunca del cuerpo de la petición.** Si el cliente pudiera decir "soy
 * el pasajero X", cualquiera cancelaría la reserva de otro. Es el
 * mismo agujero que ya cerré en la app web.
 */
@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Request() req, @Body() dto: BookingCreateDto) {
    return this.bookings.create({
      trip_id: dto.trip_id,
      passenger_id: req.user.id,
      seats: dto.seats,
      method: dto.method,
    });
  }

  /** Mis reservas. Como conductor, `?as=driver` da las solicitudes. */
  @Get()
  list(@Request() req, @Query('as') as?: string, @Query('status') status?: string) {
    if (as === 'driver') {
      return this.bookings.findByDriver(req.user.id, status);
    }
    return this.bookings.findByPassenger(req.user.id);
  }

  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string, @Body() dto: BookingCancelDto) {
    return this.bookings.cancel(id, req.user.id, dto.reason, dto.no_show);
  }

  /** El conductor (o un admin) confirma que el pago llegó. */
  @Post(':id/confirm-payment')
  confirmPayment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: PaymentConfirmDto,
  ) {
    if (!['driver', 'admin'].includes(req.user.role)) {
      throw new ForbiddenException('Solo el conductor confirma el pago');
    }
    return this.bookings.confirmPayment(id, dto.reference, req.user.id);
  }
}
