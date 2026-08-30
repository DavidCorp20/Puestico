import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsString, IsUrl } from 'class-validator';
import { DbService } from '../../database/db.service';

/** Los cuatro documentos que pide el alta de conductor. */
export enum DocType {
  cedula = 'cedula',
  licencia = 'licencia',
  seguro = 'seguro',
  vehicle_photo = 'vehicle_photo',
}

class DocumentUploadDto {
  @IsEnum(DocType, {
    message: `doc_type debe ser uno de: ${Object.values(DocType).join(', ')}`,
  })
  doc_type: DocType;

  // Se guarda una URL, no el archivo: subir la imagen es cosa del
  // cliente contra el almacenamiento, y así la API no mueve binarios.
  @IsUrl({ require_tld: false }) file_url: string;
}

class IdentityDto {
  @IsString() name: string;
  @IsString() id_doc: string;
}

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly db: DbService) {}

  private assertDriver(req: any) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Esto es del recorrido de conductor');
    }
  }

  /** Mi ficha de conductor: reputación, ganancias y estado de la verificación. */
  @Get('me')
  async getMyProfile(@Request() req) {
    this.assertDriver(req);

    // Se crea al vuelo si no existe: un conductor sin ficha no puede
    // ni empezar, y obligarlo a un paso previo no aporta nada.
    await this.db.query(
      `INSERT INTO driver_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id],
    );

    return this.db.one(
      `SELECT dp.verified, dp.verification_status, dp.rating,
              dp.completed_trips, dp.total_earnings_usd, dp.background_check,
              dp.vehicle_id,
              u.name, u.id_doc, u.phone,
              v.plate, v.model, v.color, v.seats,
              (SELECT count(*) FROM trips t
                WHERE t.driver_id = dp.user_id AND t.status = 'scheduled')
                AS upcoming_trips,
              (SELECT COALESCE(SUM(p.driver_amount_usd), 0)
                 FROM bookings b
                 JOIN trips t   ON t.id = b.trip_id
                 JOIN payments p ON p.id = b.payment_id
                WHERE t.driver_id = dp.user_id
                  AND p.status = 'confirmed')
                AS earnings_confirmed_usd
         FROM driver_profiles dp
         JOIN users u ON u.id = dp.user_id
         LEFT JOIN vehicles v ON v.id = dp.vehicle_id
        WHERE dp.user_id = $1`,
      [req.user.id],
    );
  }

  /**
   * Cargar nombre y cédula. Va aparte del perfil general porque es el
   * requisito real para verificarse: sin estos dos datos la base no
   * permite marcar un conductor como verificado.
   */
  @Post('me/identity')
  async setIdentity(@Request() req, @Body() dto: IdentityDto) {
    this.assertDriver(req);
    const rows = await this.db.query(
      `UPDATE users SET name = $2, id_doc = $3, updated_at = NOW()
        WHERE id = $1 RETURNING id, name, id_doc`,
      [req.user.id, dto.name, dto.id_doc.toUpperCase()],
    );
    return rows[0];
  }

  /**
   * Subir un documento. Reemplaza el anterior del mismo tipo: si te
   * rechazaron la licencia, mandás otra, y no quedan dos compitiendo.
   */
  @Post('me/documents')
  async uploadDocument(@Request() req, @Body() dto: DocumentUploadDto) {
    this.assertDriver(req);

    return this.db.transaction(async (client) => {
      await client.query(
        `DELETE FROM verification_documents
          WHERE user_id = $1 AND doc_type = $2 AND status <> 'approved'`,
        [req.user.id, dto.doc_type],
      );

      const { rows } = await client.query(
        `INSERT INTO verification_documents (user_id, doc_type, file_url)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.user.id, dto.doc_type, dto.file_url],
      );

      // Con los cuatro documentos cargados, la solicitud pasa a
      // revisión sola. Que el conductor tenga que "enviar" además de
      // subir es un paso que solo genera solicitudes olvidadas.
      const { rows: counted } = await client.query(
        `SELECT count(DISTINCT doc_type) AS n
           FROM verification_documents
          WHERE user_id = $1 AND status <> 'rejected'`,
        [req.user.id],
      );
      if (Number(counted[0].n) >= Object.keys(DocType).length) {
        await client.query(
          `UPDATE driver_profiles
              SET verification_status = 'in_review', updated_at = NOW()
            WHERE user_id = $1 AND verification_status = 'pending'`,
          [req.user.id],
        );
      }

      return rows[0];
    });
  }

  /**
   * Estado de la verificación, con lo que FALTA explícito. Un estado
   * "pendiente" sin decir de qué es la razón número uno de que la
   * gente abandone el alta.
   */
  @Get('me/verification-status')
  async getVerificationStatus(@Request() req) {
    this.assertDriver(req);

    const profile = await this.db.one<any>(
      `SELECT dp.verified, dp.verification_status, u.name, u.id_doc
         FROM driver_profiles dp
         JOIN users u ON u.id = dp.user_id
        WHERE dp.user_id = $1`,
      [req.user.id],
    );

    const docs = await this.db.query<any>(
      `SELECT doc_type, status, rejection_reason, created_at, reviewed_at
         FROM verification_documents
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id],
    );

    const present = new Set(
      docs.filter((d) => d.status !== 'rejected').map((d) => d.doc_type),
    );
    const missing = Object.values(DocType).filter((t) => !present.has(t));
    const hasVehicle = await this.db.one(
      `SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1`,
      [req.user.id],
    );

    const pending: string[] = [];
    if (!profile?.name) pending.push('Cargar tu nombre completo');
    if (!profile?.id_doc) pending.push('Cargar tu cédula');
    if (!hasVehicle) pending.push('Registrar tu vehículo');
    for (const m of missing) pending.push(`Subir: ${m}`);
    for (const d of docs.filter((x) => x.status === 'rejected')) {
      pending.push(`Reemplazar ${d.doc_type}: ${d.rejection_reason ?? 'rechazado'}`);
    }

    return {
      verified: profile?.verified ?? false,
      status: profile?.verification_status ?? 'pending',
      documents: docs,
      pending_steps: pending,
      ready_for_review: pending.length === 0,
    };
  }

  /** Mis ganancias, con el desglose que un conductor quiere ver. */
  @Get('me/earnings')
  async earnings(@Request() req) {
    this.assertDriver(req);
    const summary = await this.db.one(
      `SELECT COALESCE(SUM(p.amount_usd), 0)         AS gross_usd,
              COALESCE(SUM(p.commission_usd), 0)     AS commission_usd,
              COALESCE(SUM(p.driver_amount_usd), 0)  AS net_usd,
              count(*)                               AS paid_bookings
         FROM bookings b
         JOIN trips t    ON t.id = b.trip_id
         JOIN payments p ON p.id = b.payment_id
        WHERE t.driver_id = $1 AND p.status = 'confirmed'`,
      [req.user.id],
    );

    const byTrip = await this.db.query(
      `SELECT t.id, t.origin, t.destination, t.departure_date,
              count(b.id)                            AS passengers,
              COALESCE(SUM(p.driver_amount_usd), 0)  AS net_usd
         FROM trips t
         LEFT JOIN bookings b ON b.trip_id = t.id
         LEFT JOIN payments p ON p.id = b.payment_id AND p.status = 'confirmed'
        WHERE t.driver_id = $1
        GROUP BY t.id, t.origin, t.destination, t.departure_date
        ORDER BY t.departure_date DESC
        LIMIT 30`,
      [req.user.id],
    );

    return { summary, by_trip: byTrip };
  }
}
