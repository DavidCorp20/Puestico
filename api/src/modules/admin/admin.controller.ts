import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { DbService } from '../../database/db.service';

class RejectDto {
  @IsString() @MaxLength(500) reason: string;
}

class ResolveDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/**
 * Panel de operaciones.
 *
 * Dos cosas que definen este módulo:
 *
 * 1. **Todo está reservado a `admin`** con un guardia de rol, no con
 *    comprobaciones sueltas. Un endpoint nuevo hereda la protección
 *    por estar en esta clase.
 * 2. **Toda acción queda en la bitácora** (`audit_log`) con quién,
 *    qué y sobre qué. Aprobar un conductor o confirmar un pago mueve
 *    dinero y confianza: sin rastro no hay forma de revisar una
 *    decisión después.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly db: DbService) {}

  private audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    detail?: unknown,
  ) {
    return this.db.query(
      `INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [actorId, action, targetType, targetId, JSON.stringify(detail ?? {})],
    );
  }

  /** Resumen de operación: lo que hay que atender hoy. */
  @Get('dashboard')
  async dashboard() {
    return this.db.one(
      `SELECT
         (SELECT count(*) FROM driver_profiles
           WHERE verification_status = 'in_review')       AS drivers_in_review,
         (SELECT count(*) FROM payments
           WHERE status = 'pending')                      AS payments_pending,
         (SELECT count(*) FROM incidents
           WHERE status <> 'resolved')                    AS incidents_open,
         (SELECT count(*) FROM incidents
           WHERE type = 'panic' AND status = 'open')      AS panics_open,
         (SELECT count(*) FROM trips
           WHERE status = 'active')                       AS trips_active,
         (SELECT count(*) FROM trips
           WHERE departure_date = CURRENT_DATE)           AS trips_today,
         (SELECT count(*) FROM users
           WHERE created_at::date = CURRENT_DATE)         AS signups_today,
         (SELECT COALESCE(SUM(commission_usd), 0) FROM payments
           WHERE status = 'confirmed')                    AS commission_total_usd`,
    );
  }

  // ─── Conductores ────────────────────────────────────────────

  @Get('drivers/pending')
  pendingDrivers() {
    return this.db.query(
      `SELECT dp.user_id, dp.verification_status, dp.created_at,
              u.name, u.phone, u.id_doc,
              v.plate, v.model, v.year, v.color,
              COALESCE(
                (SELECT json_agg(json_build_object(
                    'doc_type', d.doc_type, 'status', d.status,
                    'file_url', d.file_url, 'id', d.id))
                   FROM verification_documents d
                  WHERE d.user_id = dp.user_id), '[]'::json)
                AS documents
         FROM driver_profiles dp
         JOIN users u ON u.id = dp.user_id
         LEFT JOIN vehicles v ON v.id = dp.vehicle_id
        WHERE dp.verification_status IN ('pending', 'in_review')
        ORDER BY dp.created_at ASC
        LIMIT 100`,
    );
  }

  /**
   * Aprobar un conductor. La base exige nombre y cédula para marcarlo
   * verificado (migración 003), así que un expediente incompleto no
   * puede aprobarse ni por error humano.
   */
  @Post('drivers/:id/approve')
  async approveDriver(@Request() req, @Param('id') id: string) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE driver_profiles
            SET verified = TRUE, verification_status = 'approved',
                background_check = TRUE, updated_at = NOW()
          WHERE user_id = $1
        RETURNING user_id, verified, verification_status`,
        [id],
      );
      if (!rows.length) throw new BadRequestException('Ese conductor no existe');

      await client.query(
        `UPDATE verification_documents
            SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
          WHERE user_id = $1 AND status <> 'approved'`,
        [id, req.user.id],
      );
      await client.query(
        `UPDATE vehicles SET verified = TRUE, updated_at = NOW()
          WHERE owner_id = $1`,
        [id],
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, payload)
         VALUES ($1, 'driver_approved', 'Tu cuenta de conductor fue aprobada',
                 '{}'::jsonb)`,
        [id],
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
         VALUES ($1, 'driver.approve', 'user', $2, '{}'::jsonb)`,
        [req.user.id, id],
      );

      return rows[0];
    });
  }

  @Post('drivers/:id/reject')
  async rejectDriver(@Request() req, @Param('id') id: string, @Body() dto: RejectDto) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE driver_profiles
            SET verified = FALSE, verification_status = 'rejected',
                updated_at = NOW()
          WHERE user_id = $1
        RETURNING user_id, verification_status`,
        [id],
      );
      if (!rows.length) throw new BadRequestException('Ese conductor no existe');

      // El motivo se guarda en el documento: el conductor tiene que
      // poder leer QUÉ arreglar, no solo que fue rechazado.
      await client.query(
        `UPDATE verification_documents
            SET status = 'rejected', rejection_reason = $3,
                reviewed_by = $2, reviewed_at = NOW()
          WHERE user_id = $1 AND status = 'pending'`,
        [id, req.user.id, dto.reason],
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, payload)
         VALUES ($1, 'driver_rejected', 'Falta corregir algo en tu solicitud',
                 $2::jsonb)`,
        [id, JSON.stringify({ reason: dto.reason })],
      );
      await client.query(
        `INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
         VALUES ($1, 'driver.reject', 'user', $2, $3::jsonb)`,
        [req.user.id, id, JSON.stringify({ reason: dto.reason })],
      );

      return rows[0];
    });
  }

  // ─── Pagos ──────────────────────────────────────────────────

  @Get('payments/pending')
  pendingPayments() {
    return this.db.query(
      `SELECT p.id, p.amount_usd, p.amount_bs, p.method, p.reference, p.created_at,
              b.id AS booking_id, b.seats,
              pu.name AS passenger_name, pu.phone AS passenger_phone,
              du.name AS driver_name,
              t.origin, t.destination, t.departure_date
         FROM payments p
         JOIN bookings b ON b.id = p.booking_id
         JOIN trips t    ON t.id = b.trip_id
         JOIN users pu   ON pu.id = b.passenger_id
         JOIN users du   ON du.id = t.driver_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at ASC
        LIMIT 200`,
    );
  }

  /**
   * Informe de comisiones. Es el número del negocio, así que sale de
   * los pagos CONFIRMADOS y agrupado por día — no de una estimación.
   */
  @Get('payments/report')
  paymentsReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from || '1970-01-01';
    const toDate = to || '2999-12-31';
    return this.db.query(
      `SELECT p.created_at::date              AS day,
              count(*)                        AS payments,
              SUM(p.amount_usd)               AS gross_usd,
              SUM(p.commission_usd)           AS commission_usd,
              SUM(p.driver_amount_usd)        AS drivers_usd
         FROM payments p
        WHERE p.status = 'confirmed'
          AND p.created_at::date BETWEEN $1::date AND $2::date
        GROUP BY day
        ORDER BY day DESC`,
      [fromDate, toDate],
    );
  }

  // ─── Incidentes ─────────────────────────────────────────────

  @Get('incidents')
  incidents(@Query('status') status?: string) {
    const params: unknown[] = [];
    let filter = `WHERE i.status <> 'resolved'`;
    if (status) {
      params.push(status);
      filter = `WHERE i.status = $1`;
    }
    return this.db.query(
      `SELECT i.id, i.type, i.status, i.description, i.created_at, i.resolved_at,
              ST_Y(i.location::geometry) AS lat,
              ST_X(i.location::geometry) AS lng,
              u.name AS reporter_name, u.phone AS reporter_phone,
              t.id AS trip_id, t.origin, t.destination, t.departure_date
         FROM incidents i
         JOIN users u ON u.id = i.reporter_id
         JOIN trips t ON t.id = i.trip_id
         ${filter}
        ORDER BY (i.type = 'panic') DESC, i.created_at DESC
        LIMIT 200`,
      params,
    );
  }

  @Post('incidents/:id/resolve')
  async resolveIncident(@Request() req, @Param('id') id: string, @Body() dto: ResolveDto) {
    const rows = await this.db.query(
      `UPDATE incidents
          SET status = 'resolved', resolved_at = NOW(), assigned_to = $2
        WHERE id = $1
      RETURNING *`,
      [id, req.user.id],
    );
    if (!rows.length) throw new BadRequestException('Ese incidente no existe');
    await this.audit(req.user.id, 'incident.resolve', 'incident', id, dto);
    return rows[0];
  }

  // ─── Usuarios ───────────────────────────────────────────────

  /** Suspender una cuenta. Queda registrado quién y por qué. */
  @Post('users/:id/suspend')
  async suspendUser(@Request() req, @Param('id') id: string, @Body() dto: RejectDto) {
    if (id === req.user.id) {
      throw new BadRequestException('No podés suspender tu propia cuenta');
    }
    const rows = await this.db.query(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
        WHERE id = $1 RETURNING id, name, status`,
      [id],
    );
    if (!rows.length) throw new BadRequestException('Ese usuario no existe');
    await this.audit(req.user.id, 'user.suspend', 'user', id, dto);
    return rows[0];
  }

  @Post('users/:id/reactivate')
  async reactivateUser(@Request() req, @Param('id') id: string) {
    const rows = await this.db.query(
      `UPDATE users SET status = 'active', updated_at = NOW()
        WHERE id = $1 RETURNING id, name, status`,
      [id],
    );
    if (!rows.length) throw new BadRequestException('Ese usuario no existe');
    await this.audit(req.user.id, 'user.reactivate', 'user', id);
    return rows[0];
  }

  // ─── Bitácora ───────────────────────────────────────────────

  @Get('audit-log')
  auditLog(@Query('limit') limit?: string, @Query('actor_id') actorId?: string) {
    const max = Math.min(Number(limit) || 100, 500);
    const params: unknown[] = [max];
    let filter = '';
    if (actorId) {
      params.push(actorId);
      filter = ` WHERE a.actor_id = $2`;
    }
    return this.db.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
              u.name AS actor_name
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.actor_id
         ${filter}
        ORDER BY a.created_at DESC
        LIMIT $1`,
      params,
    );
  }
}
