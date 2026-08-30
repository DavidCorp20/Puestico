import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, MinLength } from 'class-validator';
import { DbService } from '../../database/db.service';

class UserUpdateDto {
  @IsOptional() @IsString() @MinLength(3) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() id_doc?: string;
  @IsOptional() @IsEnum(['passenger', 'driver']) role?: 'passenger' | 'driver';
  @IsOptional() @IsString() selfie_url?: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly db: DbService) {}

  /**
   * Perfil público de otra persona: lo que ve un pasajero del conductor
   * antes de subirse. **Nunca incluye teléfono ni correo** — para
   * decidir si te montas con alguien necesitas su reputación, no su
   * número. Su propio perfil completo se lee en `/auth/me`.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.db.one(
      `SELECT u.id, u.name, u.role, u.rating, u.completed_trips, u.created_at,
              u.selfie_url,
              dp.verified AS driver_verified,
              dp.verification_status,
              (SELECT count(*) FROM reviews r WHERE r.to_user_id = u.id)
                AS reviews_count
         FROM users u
         LEFT JOIN driver_profiles dp ON dp.user_id = u.id
        WHERE u.id = $1 AND u.status = 'active'`,
      [id],
    );
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }

  /**
   * Editar el perfil. Solo el propio, aunque sea admin: cambiar datos
   * de otra persona pasa por el panel de administración, que deja
   * rastro en la bitácora.
   */
  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UserUpdateDto) {
    if (req.user.id !== id) {
      throw new ForbiddenException('Solo podés editar tu propio perfil');
    }

    const fields = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (!fields.length) return this.findById(id);

    const sets = fields.map(([k], i) => `${k} = $${i + 2}`);
    const rows = await this.db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $1
      RETURNING id, name, phone, email, id_doc, role, rating, completed_trips`,
      [id, ...fields.map(([, v]) => v)],
    );

    // Pasar a conductor crea su ficha si no la tenía: sin ella no puede
    // registrar vehículo ni publicar.
    if (dto.role === 'driver') {
      await this.db.query(
        `INSERT INTO driver_profiles (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [id],
      );
    }
    return rows[0];
  }

  /** Las calificaciones que recibió — su reputación, pública. */
  @Get(':id/reviews')
  reviews(@Param('id') id: string) {
    return this.db.query(
      `SELECT r.rating, r.comment, r.created_at,
              u.name AS from_name,
              t.origin, t.destination, t.departure_date
         FROM reviews r
         JOIN users u ON u.id = r.from_user_id
         JOIN trips t ON t.id = r.trip_id
        WHERE r.to_user_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50`,
      [id],
    );
  }
}
