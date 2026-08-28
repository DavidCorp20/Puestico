import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  @Get('drivers/pending')
  pendingDrivers() { /* TODO */ }

  @Post('drivers/:id/approve')
  approveDriver(@Param('id') id: string) { /* TODO */ }

  @Post('drivers/:id/reject')
  rejectDriver(@Param('id') id: string, @Body() dto: any) { /* TODO */ }

  @Get('payments/pending')
  pendingPayments() { /* TODO */ }

  @Get('payments/report')
  paymentsReport(@Query('period') period: string, @Query('from') from: string, @Query('to') to: string) { /* TODO */ }

  @Get('incidents')
  incidents(@Query('status') status: string) { /* TODO */ }

  @Get('audit-log')
  auditLog(@Query('limit') limit: number, @Query('actor_id') actorId: string) { /* TODO */ }
}
