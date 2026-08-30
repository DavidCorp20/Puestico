import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

/**
 * Acceso a PostgreSQL con `pg` directo.
 *
 * Por qué SQL y no un ORM: el corazón de la app es una búsqueda
 * geográfica (PostGIS) y una reserva con bloqueo de fila. Las dos se
 * expresan mejor en SQL, y con un ORM en medio uno termina peleando
 * para que genere la consulta que ya sabía escribir. El esquema
 * además ya existe en SQL versionado (migrations/), que es la fuente
 * de verdad — no las entidades.
 *
 * `synchronize` NUNCA se usa: en producción una entidad mal escrita
 * podría borrar una columna con datos.
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private pool: Pool | null = null;
  private ready = false;

  async onModuleInit() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.warn(
        'DATABASE_URL sin definir: la API arranca, pero los endpoints que ' +
          'leen datos responderán 503. El contrato (Swagger) sigue visible.',
      );
      return;
    }

    this.pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Railway y la mayoría de los proveedores exigen TLS, y el
      // certificado es de una CA interna: verificarlo falla.
      ssl: /\bsslmode=require\b/.test(url)
        ? { rejectUnauthorized: false }
        : undefined,
    });

    // Un error en un cliente en reposo no debe tumbar el proceso.
    this.pool.on('error', (err) =>
      this.logger.error(`Cliente de la base con error: ${err.message}`),
    );

    try {
      await this.pool.query('SELECT 1');
      this.ready = true;
      this.logger.log('Base de datos conectada');
    } catch (err) {
      this.logger.error(
        `No se pudo conectar a la base: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  get isReady() {
    return this.ready;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    if (!this.pool) throw new Error('DB_UNAVAILABLE');
    const res = await this.pool.query<T>(sql, params);
    return res.rows;
  }

  async one<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /**
   * Transacción. El COMMIT/ROLLBACK va acá y no en cada servicio para
   * que no exista la posibilidad de olvidar un rollback y dejar una
   * conexión con transacción abierta — eso bloquea filas para todos.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('DB_UNAVAILABLE');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** ¿Responde la base, y con qué latencia? Lo usa /api/health. */
  async ping(): Promise<{ ok: boolean; latency_ms?: number; error?: string }> {
    if (!this.pool) return { ok: false, error: 'DATABASE_URL sin definir' };
    const started = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { ok: true, latency_ms: Date.now() - started };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
