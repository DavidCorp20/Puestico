import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsArray, Min, Max, Matches } from 'class-validator';
import { DbService } from '../../database/db.service';

/**
 * Normaliza una placa para COMPARAR: mayúsculas y sin guiones ni
 * espacios. Sin esto `ABC-12A` y `ABC12A` se consideran carros
 * distintos, y ahí se cuela un duplicado — lo comprobé: la placa de
 * un conductor entró dos veces escrita de las dos formas.
 */
function plateKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

class VehicleCreateDto {
  // Placa venezolana: se acepta con o sin guion y se normaliza. Lo que
  // se guarda es la forma limpia, para que la comparación sea trivial.
  @Matches(/^[A-Za-z0-9-]{5,10}$/, {
    message: 'La placa debe tener entre 5 y 10 caracteres (letras, números y guion)',
  })
  plate: string;

  @IsString() model: string;
  @IsInt() @Min(1980) @Max(2100) year: number;
  @IsOptional() @IsString() color?: string;
  @IsInt() @Min(1) @Max(8) seats: number;
  @IsOptional() @IsArray() photos?: string[];
}

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly db: DbService) {}

  /**
   * Registrar un carro.
   *
   * La placa es única en toda la plataforma a propósito: dos cuentas
   * con el mismo carro es la forma más simple de esquivar una
   * suspensión. Si la placa ya existe, se dice claro en vez de dejar
   * salir el error de la base.
   */
  @Post()
  async create(@Request() req, @Body() dto: VehicleCreateDto) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException(
        'Para registrar un vehículo tenés que estar como conductor',
      );
    }

    const plate = plateKey(dto.plate);
    const taken = await this.db.one<{ owner_id: string }>(
      // La comparación normaliza AMBOS lados: los datos existentes
      // pueden tener guion y los nuevos no.
      `SELECT owner_id FROM vehicles
        WHERE REGEXP_REPLACE(UPPER(plate), '[^A-Z0-9]', '', 'g') = $1`,
      [plate],
    );
    if (taken) {
      throw new ConflictException(
        taken.owner_id === req.user.id
          ? 'Ya tenés este vehículo registrado'
          : 'Esa placa ya está registrada por otra cuenta',
      );
    }

    const rows = await this.db.query(
      `INSERT INTO vehicles (owner_id, plate, model, year, color, seats, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        req.user.id,
        plate,
        dto.model,
        dto.year,
        dto.color ?? null,
        dto.seats,
        JSON.stringify(dto.photos ?? []),
      ],
    );
    const vehicle = rows[0];

    // Si es su primer carro, queda como el vehículo por defecto de su
    // ficha de conductor: así publicar no le pide elegir nada.
    await this.db.query(
      `UPDATE driver_profiles SET vehicle_id = $2, updated_at = NOW()
        WHERE user_id = $1 AND vehicle_id IS NULL`,
      [req.user.id, vehicle.id],
    );

    return vehicle;
  }

  /** Mis vehículos. */
  @Get()
  list(@Request() req) {
    return this.db.query(
      `SELECT * FROM vehicles WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.user.id],
    );
  }

  /**
   * Un vehículo. Si no es tuyo se devuelve la vista PÚBLICA (modelo,
   * color, placa y si está verificado): es lo que el pasajero necesita
   * para reconocer el carro que lo viene a buscar.
   */
  @Get(':id')
  async findById(@Request() req, @Param('id') id: string) {
    const vehicle = await this.db.one<any>(
      `SELECT * FROM vehicles WHERE id = $1`,
      [id],
    );
    if (!vehicle) throw new NotFoundException('El vehículo no existe');

    if (vehicle.owner_id === req.user.id || req.user.role === 'admin') {
      return vehicle;
    }
    return {
      id: vehicle.id,
      model: vehicle.model,
      color: vehicle.color,
      plate: vehicle.plate,
      year: vehicle.year,
      seats: vehicle.seats,
      verified: vehicle.verified,
    };
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: Partial<VehicleCreateDto>) {
    const vehicle = await this.db.one<{ owner_id: string }>(
      `SELECT owner_id FROM vehicles WHERE id = $1`,
      [id],
    );
    if (!vehicle) throw new NotFoundException('El vehículo no existe');
    if (vehicle.owner_id !== req.user.id) {
      throw new ForbiddenException('El vehículo no es tuyo');
    }

    // La placa no se edita: cambiarla convertiría el registro en otro
    // carro y arrastraría el historial de viajes del anterior.
    if (dto.plate) {
      throw new BadRequestException(
        'La placa no se puede cambiar. Registrá el vehículo nuevo aparte.',
      );
    }

    const fields = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (!fields.length) return this.findById(req, id);

    const sets = fields.map(([k], i) =>
      k === 'photos' ? `photos = $${i + 2}::jsonb` : `${k} = $${i + 2}`,
    );
    const rows = await this.db.query(
      `UPDATE vehicles SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [
        id,
        ...fields.map(([k, v]) => (k === 'photos' ? JSON.stringify(v) : v)),
      ],
    );
    return rows[0];
  }
}
