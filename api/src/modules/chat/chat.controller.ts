import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  @Get('conversations')
  listConversations() { /* TODO */ }

  @Get('conversations/:id/messages')
  getMessages(@Param('id') id: string) { /* TODO */ }

  @Post('conversations/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: any) { /* TODO */ }
}
