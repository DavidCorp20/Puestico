import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { DbService } from '../../database/db.service';

class MessageDto {
  @IsString() @MinLength(1) @MaxLength(1000) content: string;
}

class ConversationDto {
  @IsUUID() trip_id: string;
}

/**
 * Chat entre el conductor y el pasajero de un viaje.
 *
 * Reglas que importan y por qué:
 *  · La conversación **nace de una reserva**, no de la nada. Sin eso el
 *    chat es un canal para escribirle a cualquiera de la plataforma.
 *  · Cada acceso comprueba que seas parte de ESA conversación. Es lo
 *    que evita leer la conversación de otros cambiando el número en la
 *    dirección — el error más común y más fácil de explotar.
 *  · El teléfono no se muestra: el chat existe justamente para
 *    coordinar sin darlo.
 */
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly db: DbService) {}

  private async assertMember(conversationId: string, userId: string) {
    const conv = await this.db.one<any>(
      `SELECT id, trip_id, driver_id, passenger_id
         FROM conversations WHERE id = $1`,
      [conversationId],
    );
    if (!conv) throw new BadRequestException('La conversación no existe');
    if (conv.driver_id !== userId && conv.passenger_id !== userId) {
      throw new ForbiddenException('No participás en esta conversación');
    }
    return conv;
  }

  /** Mis conversaciones, con el último mensaje y los no leídos. */
  @Get('conversations')
  listConversations(@Request() req) {
    return this.db.query(
      `SELECT c.id, c.trip_id,
              t.origin, t.destination, t.departure_date, t.departure_time,
              t.status AS trip_status,
              CASE WHEN c.driver_id = $1 THEN pu.id  ELSE du.id  END AS other_id,
              CASE WHEN c.driver_id = $1 THEN pu.name ELSE du.name END AS other_name,
              CASE WHEN c.driver_id = $1 THEN 'passenger' ELSE 'driver' END
                AS other_role,
              lm.content    AS last_message,
              lm.created_at AS last_message_at,
              (SELECT count(*) FROM chat_messages m
                WHERE m.conversation_id = c.id AND m.sender_id <> $1)
                AS messages_from_other
         FROM conversations c
         JOIN trips t ON t.id = c.trip_id
         JOIN users du ON du.id = c.driver_id
         JOIN users pu ON pu.id = c.passenger_id
         LEFT JOIN LATERAL (
                SELECT content, created_at FROM chat_messages m
                 WHERE m.conversation_id = c.id
                 ORDER BY m.created_at DESC LIMIT 1
              ) lm ON TRUE
        WHERE c.driver_id = $1 OR c.passenger_id = $1
        ORDER BY COALESCE(lm.created_at, c.created_at) DESC
        LIMIT 50`,
      [req.user.id],
    );
  }

  /**
   * Abrir (o recuperar) la conversación de un viaje. Idempotente: si ya
   * existe devuelve la misma, así el cliente no necesita saber si es la
   * primera vez.
   */
  @Post('conversations')
  async openConversation(@Request() req, @Body() dto: ConversationDto) {
    const trip = await this.db.one<any>(
      `SELECT id, driver_id FROM trips WHERE id = $1`,
      [dto.trip_id],
    );
    if (!trip) throw new BadRequestException('El viaje no existe');

    let driverId = trip.driver_id;
    let passengerId: string;

    if (req.user.id === driverId) {
      throw new BadRequestException(
        'Como conductor, abrí la conversación desde la solicitud del pasajero',
      );
    }

    const booking = await this.db.one(
      `SELECT id FROM bookings
        WHERE trip_id = $1 AND passenger_id = $2
          AND status IN ('pending', 'confirmed', 'completed')`,
      [dto.trip_id, req.user.id],
    );
    if (!booking) {
      throw new ForbiddenException(
        'Necesitás una reserva en ese viaje para escribirle al conductor',
      );
    }
    passengerId = req.user.id;

    const rows = await this.db.query(
      `INSERT INTO conversations (trip_id, driver_id, passenger_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, driver_id, passenger_id) DO UPDATE
             SET trip_id = EXCLUDED.trip_id
       RETURNING *`,
      [dto.trip_id, driverId, passengerId],
    );
    return rows[0];
  }

  @Get('conversations/:id/messages')
  async getMessages(@Request() req, @Param('id') id: string) {
    await this.assertMember(id, req.user.id);
    const messages = await this.db.query(
      `SELECT m.id, m.sender_id, m.content, m.created_at, u.name AS sender_name
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        LIMIT 500`,
      [id],
    );
    return messages;
  }

  @Post('conversations/:id/messages')
  async sendMessage(@Request() req, @Param('id') id: string, @Body() dto: MessageDto) {
    const conv = await this.assertMember(id, req.user.id);

    const rows = await this.db.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, req.user.id, dto.content.trim()],
    );

    // Aviso para el otro: sin esto el mensaje existe pero nadie se
    // entera hasta que abre la app por casualidad.
    const otherId =
      conv.driver_id === req.user.id ? conv.passenger_id : conv.driver_id;
    await this.db.query(
      `INSERT INTO notifications (user_id, type, title, payload)
       VALUES ($1, 'chat_message', 'Mensaje nuevo', $2::jsonb)`,
      [
        otherId,
        JSON.stringify({ conversation_id: id, trip_id: conv.trip_id }),
      ],
    );

    return rows[0];
  }
}
