import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DbService } from '../../database/db.service';

export enum IncidentType {
  panic = 'panic',
  late_cancel = 'late_cancel',
  wrong_vehicle = 'wrong_vehicle',
  accident = 'accident',
  payment_fraud = 'payment_fraud',
  conflict = 'conflict',
  other = 'other',
}

class IncidentCreateDto {
  @IsUUID() trip_id: string;
  @IsEnum(IncidentType, {
    message: `type debe ser uno de: ${Object.values(IncidentType).join(', ')}`,
  })
  type: IncidentType;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class PanicDto {
  @IsUUID() trip_id: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

/**
 * Incidentes y botón de pánico.
 *
 * El pánico tiene una regla distinta a todo lo demás en esta API:
 * **nunca falla por validación.** Si alguien lo aprieta, es porque está
 * en problemas; rechazarlo porque falta un campo o porque el viaje no
 * está "activo" es la peor respuesta posible. Se registra con lo que
 * haya y se avisa a todos los administradores.
 */
@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly db: DbService) {}

  /** ¿Es esta persona parte del viaje? Solo ellos pueden reportar. */
  private async participates(tripId: string, userId: string) {
    const row = await this.db.one(
      `SELECT 1 FROM trips t
        WHERE t.id = $1
          AND (t.driver_id = $2
               OR EXISTS (SELECT 1 FROM bookings b
                           WHERE b.trip_id = t.id AND b.passenger_id = $2))`,
      [tripId, userId],
    );
    return Boolean(row);
  }

  private async alertAdmins(payload: Record<string, unknown>, title: string) {
    await this.db.query(
      `INSERT INTO notifications (user_id, type, title, payload)
       SELECT id, 'panic_alert', $1, $2::jsonb
         FROM users WHERE role = 'admin' AND status = 'active'`,
      [title, JSON.stringify(payload)],
    );
  }

  @Post()
  async create(@Request() req, @Body() dto: IncidentCreateDto) {
    if (!(await this.participates(dto.trip_id, req.user.id))) {
      throw new ForbiddenException('No participás en ese viaje');
    }

    const rows = await this.db.query<any>(
      `INSERT INTO incidents (trip_id, reporter_id, type, description, location)
       VALUES ($1, $2, $3, $4,
               CASE WHEN $5::float8 IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography END)
       RETURNING *`,
      [
        dto.trip_id,
        req.user.id,
        dto.type,
        dto.description ?? null,
        dto.lng ?? null,
        dto.lat ?? null,
      ],
    );

    await this.alertAdmins(
      { incident_id: rows[0].id, trip_id: dto.trip_id, type: dto.type },
      `Incidente reportado: ${dto.type}`,
    );

    return rows[0];
  }

  /**
   * Botón de pánico. Registra el incidente, avisa a operaciones y
   * devuelve los datos del viaje para que la pantalla pueda mostrar a
   * quién llamar sin otra petición.
   */
  @Post('panic')
  async panic(@Request() req, @Body() dto: PanicDto) {
    // A diferencia del resto, acá NO se rechaza por no participar: se
    // registra igual y queda marcado. Un pánico perdido es inaceptable;
    // un pánico de más lo revisa una persona en un minuto.
    const participates = await this.participates(dto.trip_id, req.user.id);

    const rows = await this.db.query<any>(
      `INSERT INTO incidents (trip_id, reporter_id, type, description, location, status)
       VALUES ($1, $2, 'panic', $3,
               CASE WHEN $4::float8 IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography END,
               'open')
       RETURNING *`,
      [
        dto.trip_id,
        req.user.id,
        [
          dto.description ?? 'Botón de pánico',
          participates ? null : '(el reportante no figura en el viaje)',
        ]
          .filter(Boolean)
          .join(' '),
        dto.lng ?? null,
        dto.lat ?? null,
      ],
    );

    await this.alertAdmins(
      {
        incident_id: rows[0].id,
        trip_id: dto.trip_id,
        reporter_id: req.user.id,
        lat: dto.lat,
        lng: dto.lng,
        priority: 'max',
      },
      'PÁNICO — atención inmediata',
    );

    const trip = await this.db.one(
      `SELECT t.id, t.origin, t.destination, t.departure_date, t.departure_time,
              u.name AS driver_name, u.phone AS driver_phone,
              v.plate, v.model, v.color
         FROM trips t
         JOIN users u ON u.id = t.driver_id
         LEFT JOIN vehicles v ON v.id = t.vehicle_id
        WHERE t.id = $1`,
      [dto.trip_id],
    );

    return {
      incident: rows[0],
      trip,
      // Números reales de emergencia en Venezuela.
      emergency: { police: '911', transit: '0800-TRANSITO' },
      message: 'Reportado. Operaciones fue notificada.',
    };
  }

  /** Mis reportes y su estado. */
  @Get('mine')
  mine(@Request() req) {
    return this.db.query(
      `SELECT i.id, i.type, i.status, i.description, i.created_at, i.resolved_at,
              t.origin, t.destination, t.departure_date
         FROM incidents i
         JOIN trips t ON t.id = i.trip_id
        WHERE i.reporter_id = $1
        ORDER BY i.created_at DESC
        LIMIT 50`,
      [req.user.id],
    );
  }
}
