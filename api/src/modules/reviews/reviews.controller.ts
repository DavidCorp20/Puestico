import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { DbService } from '../../database/db.service';

class ReviewCreateDto {
  @IsUUID() trip_id: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(600) comment?: string;
}

/**
 * Calificaciones — la reputación es lo único que sostiene la confianza
 * en un carro con desconocidos, así que las reglas son estrictas:
 *
 *  · Solo se califica un viaje **en el que participaste**.
 *  · Solo cuando el viaje **terminó**: calificar antes convierte la
 *    nota en una amenaza durante el viaje.
 *  · Una calificación por viaje y por persona, sin edición.
 *  · La nota va **en las dos direcciones** (el conductor también
 *    califica al pasajero).
 */
@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly db: DbService) {}

  @Post()
  async create(@Request() req, @Body() dto: ReviewCreateDto) {
    return this.db.transaction(async (client) => {
      const { rows: trips } = await client.query(
        `SELECT t.id, t.driver_id, t.status
           FROM trips t WHERE t.id = $1`,
        [dto.trip_id],
      );
      const trip = trips[0];
      if (!trip) throw new BadRequestException('El viaje no existe');
      if (trip.status !== 'completed') {
        throw new BadRequestException(
          'Podés calificar cuando el viaje haya terminado',
        );
      }

      // ¿Quién es quién en este viaje? De acá sale a quién se califica:
      // el cliente no lo elige, así que no se puede calificar a alguien
      // que no viajó con vos.
      const { rows: mine } = await client.query(
        `SELECT passenger_id FROM bookings
          WHERE trip_id = $1 AND passenger_id = $2
            AND status IN ('completed', 'confirmed')`,
        [dto.trip_id, req.user.id],
      );

      let toUserId: string;
      if (req.user.id === trip.driver_id) {
        // El conductor califica: necesita decir a qué pasajero. Se toma
        // el único si hubo uno; con varios se pide explícito.
        const { rows: passengers } = await client.query(
          `SELECT passenger_id FROM bookings
            WHERE trip_id = $1 AND status IN ('completed', 'confirmed')`,
          [dto.trip_id],
        );
        if (!passengers.length) {
          throw new BadRequestException('Ese viaje no llevó pasajeros');
        }
        if (passengers.length > 1) {
          throw new BadRequestException(
            'Ese viaje llevó varios pasajeros: usá /reviews/passenger para elegir a quién calificás',
          );
        }
        toUserId = passengers[0].passenger_id;
      } else if (mine.length) {
        toUserId = trip.driver_id;
      } else {
        throw new ForbiddenException('No viajaste en ese viaje');
      }

      try {
        const { rows } = await client.query(
          `INSERT INTO reviews (trip_id, from_user_id, to_user_id, rating, comment)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [dto.trip_id, req.user.id, toUserId, dto.rating, dto.comment ?? null],
        );

        // El promedio se recalcula sobre TODAS sus calificaciones, no
        // se ajusta sumando: un promedio incremental se desvía y no hay
        // forma de saber cuánto.
        await client.query(
          `UPDATE users u
              SET rating = sub.avg_rating, updated_at = NOW()
             FROM (SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating
                     FROM reviews WHERE to_user_id = $1) sub
            WHERE u.id = $1`,
          [toUserId],
        );
        await client.query(
          `UPDATE driver_profiles dp
              SET rating = u.rating, updated_at = NOW()
             FROM users u
            WHERE u.id = dp.user_id AND dp.user_id = $1`,
          [toUserId],
        );

        return rows[0];
      } catch (err: any) {
        if (err?.code === '23505' || /duplicate key/.test(err?.message ?? '')) {
          throw new ConflictException('Ya calificaste este viaje');
        }
        throw err;
      }
    });
  }

  /** Las calificaciones de una persona: su reputación pública. */
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.db.query(
      `SELECT r.rating, r.comment, r.created_at, u.name AS from_name,
              t.origin, t.destination, t.departure_date
         FROM reviews r
         JOIN users u ON u.id = r.from_user_id
         JOIN trips t ON t.id = r.trip_id
        WHERE r.to_user_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50`,
      [userId],
    );
  }

  /** Los viajes que me quedan por calificar — lo que empuja a calificar. */
  @Get('pending')
  pending(@Request() req) {
    return this.db.query(
      `SELECT t.id AS trip_id, t.origin, t.destination, t.departure_date,
              u.id AS to_user_id, u.name AS to_name,
              'driver' AS role_of_other
         FROM bookings b
         JOIN trips t ON t.id = b.trip_id
         JOIN users u ON u.id = t.driver_id
        WHERE b.passenger_id = $1
          AND t.status = 'completed'
          AND NOT EXISTS (SELECT 1 FROM reviews r
                           WHERE r.trip_id = t.id AND r.from_user_id = $1)
        ORDER BY t.departure_date DESC
        LIMIT 20`,
      [req.user.id],
    );
  }
}
