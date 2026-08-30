import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DbService } from '../../database/db.service';

export interface Trip {
  id: string;
  driver_id: string;
  vehicle_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  price_per_seat_usd: number;
  price_per_seat_bs?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface TripSearchQuery {
  origin: string;
  destination: string;
  date: string;
  passengers?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

/**
 * Viajes — recorrido del conductor (publicar, arrancar, cerrar) y la
 * búsqueda del pasajero.
 *
 * Esto era una clase con TODOs devolviendo listas vacías. Ahora habla
 * con PostgreSQL de verdad.
 *
 * Dos decisiones que vale explicar:
 *
 * 1. **La búsqueda es geográfica de verdad.** No compara nombres de
 *    ciudad: si llegan coordenadas, usa `ST_DWithin` sobre el índice
 *    GiST, así "cerca de mí" funciona aunque la persona escriba el
 *    sector con otro nombre. El nombre queda como filtro de respaldo.
 *
 * 2. **`seats_available` no se toca a mano acá.** Lo mantiene el
 *    disparador de la migración 002 a partir de las reservas vivas.
 *    Un contador que se actualiza desde varios sitios termina
 *    desincronizado, y en este caso desincronizado significa vender
 *    un puesto que no existe.
 */
@Injectable()
export class TripsService {
  constructor(private readonly db: DbService) {}

  private assertDb() {
    if (!this.db.isReady) {
      throw new ServiceUnavailableException(
        'La base de datos no está disponible',
      );
    }
  }

  /**
   * Columnas públicas de un viaje + conductor y vehículo.
   *
   * Lleva un hueco `%EXTRA%` en la lista de columnas: la distancia al
   * punto de recogida solo existe cuando la búsqueda es por cercanía.
   * El hueco va ACÁ y no pegando texto al final, porque después de los
   * JOIN ya no se pueden agregar columnas — pegarlo ahí devolvía la
   * consulta sin la distancia.
   */
  private static readonly SELECT_TRIP = `
    SELECT t.id, t.driver_id, t.vehicle_id, t.origin, t.destination,
           t.departure_date, t.departure_time, t.seats_total,
           t.seats_available, t.price_per_seat_usd, t.price_per_seat_bs,
           t.status, t.created_at,
           ST_Y(t.origin_coords::geometry)      AS origin_lat,
           ST_X(t.origin_coords::geometry)      AS origin_lng,
           ST_Y(t.destination_coords::geometry) AS destination_lat,
           ST_X(t.destination_coords::geometry) AS destination_lng,
           u.name AS driver_name, u.rating AS driver_rating,
           u.completed_trips AS driver_trips,
           v.model AS vehicle_model, v.color AS vehicle_color,
           v.plate AS vehicle_plate
           %EXTRA%
      FROM trips t
      JOIN users u    ON u.id = t.driver_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
  `;

  async search(query: TripSearchQuery): Promise<any[]> {
    this.assertDb();

    const seats = Number(query.passengers) > 0 ? Number(query.passengers) : 1;
    const params: unknown[] = [query.date, seats];
    const where: string[] = [
      `t.status = 'scheduled'`,
      `t.departure_date = $1::date`,
      `t.seats_available >= $2`,
      // Un viaje de hoy que ya salió no debe aparecer.
      `(t.departure_date > CURRENT_DATE
         OR t.departure_time > CURRENT_TIME)`,
    ];

    const hasCoords =
      Number.isFinite(Number(query.lat)) && Number.isFinite(Number(query.lng));

    if (hasCoords) {
      // Búsqueda por cercanía: usa el índice GiST de origin_coords.
      const radiusKm = Number(query.radius_km) > 0 ? Number(query.radius_km) : 15;
      params.push(Number(query.lng), Number(query.lat), radiusKm * 1000);
      where.push(
        `ST_DWithin(t.origin_coords,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
                    $5)`,
      );
    } else if (query.origin) {
      params.push(`%${query.origin}%`);
      where.push(`t.origin ILIKE $${params.length}`);
    }

    if (query.destination) {
      params.push(`%${query.destination}%`);
      where.push(`t.destination ILIKE $${params.length}`);
    }

    const distanceCol = hasCoords
      ? `, ROUND((ST_Distance(t.origin_coords,
             ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) / 1000)::numeric, 1)
             AS pickup_distance_km`
      : '';

    const sql = `
      ${TripsService.SELECT_TRIP.replace('%EXTRA%', distanceCol)}
      WHERE ${where.join(' AND ')}
      ORDER BY ${hasCoords ? 'pickup_distance_km ASC,' : ''}
               t.departure_time ASC
      LIMIT 50
    `;

    return this.db.query(sql, params);
  }

  async findById(id: string): Promise<Trip | null> {
    this.assertDb();
    return this.db.one<any>(
      `${TripsService.SELECT_TRIP.replace('%EXTRA%', '')} WHERE t.id = $1`,
      [id],
    );
  }

  async create(data: Partial<Trip> & {
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
  }, driverId?: string): Promise<Trip> {
    this.assertDb();

    const driver = driverId || data.driver_id;
    if (!driver) throw new BadRequestException('Falta el conductor');

    // El vehículo tiene que ser DEL conductor. Sin esta comprobación
    // cualquiera publica un viaje con el carro de otro.
    // La columna es `owner_id`, no `driver_id` (así está en el esquema).
    const vehicle = await this.db.one<{ id: string }>(
      `SELECT id FROM vehicles WHERE id = $1 AND owner_id = $2`,
      [data.vehicle_id, driver],
    );
    if (!vehicle) {
      throw new BadRequestException(
        'El vehículo no existe o no está registrado a tu nombre',
      );
    }

    const rows = await this.db.query<any>(
      `INSERT INTO trips (driver_id, vehicle_id, origin, destination,
                          origin_coords, destination_coords,
                          departure_date, departure_time,
                          seats_total, seats_available,
                          price_per_seat_usd, price_per_seat_bs)
       VALUES ($1, $2, $3, $4,
               CASE WHEN $5::float8 IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography END,
               CASE WHEN $7::float8 IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography END,
               $9, $10, $11, $11, $12, $13)
       RETURNING *`,
      [
        driver,
        data.vehicle_id,
        data.origin,
        data.destination,
        data.origin_lng ?? null,
        data.origin_lat ?? null,
        data.destination_lng ?? null,
        data.destination_lat ?? null,
        data.departure_date,
        data.departure_time,
        data.seats_total,
        data.price_per_seat_usd,
        data.price_per_seat_bs ?? null,
      ],
    );
    return rows[0];
  }

  /**
   * Cambio de estado, con las transiciones válidas explícitas: sin
   * esto se puede "arrancar" un viaje ya terminado, y cerrar un viaje
   * mueve dinero.
   */
  async updateStatus(
    id: string,
    status: Trip['status'],
    actorId?: string,
  ): Promise<void> {
    this.assertDb();

    const trip = await this.db.one<{ driver_id: string; status: string }>(
      `SELECT driver_id, status FROM trips WHERE id = $1`,
      [id],
    );
    if (!trip) throw new NotFoundException('El viaje no existe');
    if (actorId && trip.driver_id !== actorId) {
      throw new BadRequestException('El viaje no es tuyo');
    }

    const allowed: Record<string, string[]> = {
      scheduled: ['active', 'cancelled'],
      active: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!allowed[trip.status]?.includes(status)) {
      throw new BadRequestException(
        `Un viaje ${trip.status} no puede pasar a ${status}`,
      );
    }

    await this.db.query(
      `UPDATE trips SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status],
    );
  }

  /** Posición en vivo. Se guarda el histórico, no solo el último punto. */
  async updateLocation(
    id: string,
    lat: number,
    lng: number,
    speed?: number,
  ): Promise<void> {
    this.assertDb();
    // La tabla guarda lat/lng como números, NO una columna geográfica
    // (así está en el esquema). Escribirlo como geografía daba error 500.
    await this.db.query(
      `INSERT INTO trip_locations (trip_id, lat, lng, speed)
       VALUES ($1, $2, $3, $4)`,
      [id, lat, lng, speed ?? null],
    );
  }

  /** El recorrido en vivo que ve el pasajero. */
  async locations(id: string, limit = 200): Promise<any[]> {
    this.assertDb();
    return this.db.query(
      `SELECT lat, lng, speed, created_at
         FROM trip_locations
        WHERE trip_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [id, limit],
    );
  }

  /**
   * Cancelar un viaje: cancela también las reservas vivas y deja
   * anotado el reembolso. Va en UNA transacción — si se cancelara el
   * viaje y fallara el reembolso, quedaría gente pagando un viaje que
   * no existe.
   */
  async cancel(id: string, actorId?: string): Promise<{ cancelled_bookings: number }> {
    this.assertDb();

    return this.db.transaction(async (client) => {
      const { rows: trips } = await client.query(
        `SELECT id, driver_id, status FROM trips WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const trip = trips[0];
      if (!trip) throw new NotFoundException('El viaje no existe');
      if (actorId && trip.driver_id !== actorId) {
        throw new BadRequestException('El viaje no es tuyo');
      }
      if (trip.status === 'cancelled') {
        throw new BadRequestException('El viaje ya estaba cancelado');
      }
      if (trip.status === 'completed') {
        throw new BadRequestException('El viaje ya finalizó');
      }

      await client.query(
        `UPDATE trips SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      // Cancela el conductor: el pasajero no tiene culpa, reembolso total.
      const { rowCount } = await client.query(
        `UPDATE bookings b
            SET status = 'cancelled',
                cancellation_reason = 'Viaje cancelado por el conductor',
                refund_percentage = 100,
                refund_amount = COALESCE(p.amount_usd, 0),
                updated_at = NOW()
           FROM (SELECT id FROM bookings WHERE trip_id = $1
                  AND status IN ('pending','confirmed')) AS target
           LEFT JOIN payments p ON p.booking_id = target.id
          WHERE b.id = target.id`,
        [id],
      );

      return { cancelled_bookings: rowCount ?? 0 };
    });
  }

  /** Los viajes de un conductor — su panel. */
  async findByDriver(driverId: string, status?: string): Promise<any[]> {
    this.assertDb();
    const params: unknown[] = [driverId];
    let filter = '';
    if (status) {
      params.push(status);
      filter = ` AND t.status = $2`;
    }
    return this.db.query(
      `${TripsService.SELECT_TRIP.replace('%EXTRA%', '')}
        WHERE t.driver_id = $1 ${filter}
        ORDER BY t.departure_date DESC, t.departure_time DESC
        LIMIT 100`,
      params,
    );
  }
}
