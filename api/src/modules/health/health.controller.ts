import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DbService } from '../../database/db.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DbService) {}

  /**
   * Salud del servicio. Incluye el estado REAL de la base, porque un
   * "ok" que no la consulta es exactamente el chequeo que no avisa
   * cuando la app está caída para el usuario.
   */
  @Get()
  async check() {
    const db = await this.db.ping();
    return {
      status: db.ok ? 'ok' : 'degraded',
      service: 'carpooling-ve-api',
      version: '0.2.0',
      database: db,
      timestamp: new Date().toISOString(),
    };
  }
}
