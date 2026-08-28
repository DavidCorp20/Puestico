import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  @Post()
  create(@Body() dto: any) { /* TODO */ }

  @Post('panic')
  panic(@Body() dto: any) {
    // TODO: Notificar inmediatamente a operaciones
    // Crear incidente tipo 'panic'
    // Push notification al admin de turno
  }
}
