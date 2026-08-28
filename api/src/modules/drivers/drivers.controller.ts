import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  @Get('me')
  getMyProfile() { /* TODO */ }

  @Post('me/documents')
  uploadDocument(@Body() dto: any) { /* TODO */ }

  @Get('me/verification-status')
  getVerificationStatus() { /* TODO */ }
}
