import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  @Get(':id')
  findById(@Param('id') id: string) {
    // TODO
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    // TODO
  }
}
