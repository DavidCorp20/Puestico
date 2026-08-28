import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  @Post()
  create(@Body() dto: any) { /* TODO: crear reserva, bloquear puesto */ }

  @Get()
  list() { /* TODO */ }

  @Get(':id')
  findById(@Param('id') id: string) { /* TODO */ }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: any) { /* TODO: aplicar política de reembolso */ }

  @Post(':id/accept')
  accept(@Param('id') id: string) { /* TODO: conductor acepta */ }

  @Post(':id/reject')
  reject(@Param('id') id: string) { /* TODO: conductor rechaza */ }
}
