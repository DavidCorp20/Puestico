import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  @Post()
  create(@Body() dto: any) { /* TODO */ }

  @Get()
  list() { /* TODO */ }

  @Get(':id')
  findById(@Param('id') id: string) { /* TODO */ }
}
