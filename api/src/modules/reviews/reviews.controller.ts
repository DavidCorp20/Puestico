import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  @Post()
  create(@Body() dto: any) { /* TODO */ }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) { /* TODO */ }
}
