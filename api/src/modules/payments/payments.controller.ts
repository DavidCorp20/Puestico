import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

class PaymentCreateDto {
  @IsString() booking_id: string;
  @IsEnum(['transfer_usd', 'zelle', 'pago_movil', 'cash']) method: string;
  @IsNumber() amount_usd: number;
  @IsOptional() @IsNumber() amount_bs?: number;
  @IsOptional() @IsString() reference?: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: PaymentCreateDto) {
    // TODO: Crear pago en BD con breakdown de comisión
    const breakdown = this.paymentsService.calculatePaymentBreakdown(dto.amount_usd, 1);
    return { ...dto, ...breakdown, status: 'pending' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string) {
    // TODO: Implementar
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    // TODO: Admin confirma pago — conciliación
  }
}
