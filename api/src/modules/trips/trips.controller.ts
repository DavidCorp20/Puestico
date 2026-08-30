import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TripsService, TripSearchQuery } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';

class TripCreateDto {
  @IsString() origin: string;
  @IsString() destination: string;
  @IsOptional() @IsNumber() origin_lat?: number;
  @IsOptional() @IsNumber() origin_lng?: number;
  @IsOptional() @IsNumber() destination_lat?: number;
  @IsOptional() @IsNumber() destination_lng?: number;
  @IsDateString() departure_date: string;
  @IsString() departure_time: string;
  @IsInt() @Min(1) seats_total: number;
  @IsNumber() @Min(0) price_per_seat_usd: number;
  @IsOptional() @IsNumber() price_per_seat_bs?: number;
  @IsString() vehicle_id: string;
}

/** IsEnum necesita un enum de verdad: con un array de strings el
    mensaje de error sale vacío ("must be one of the following values: "). */
export enum TripStatus {
  scheduled = 'scheduled',
  active = 'active',
  completed = 'completed',
  cancelled = 'cancelled',
}

class TripStatusDto {
  // Sin el decorador, el ValidationPipe con `whitelist: true` BORRA la
  // propiedad y llegaba `undefined` — el error decía "no puede pasar a
  // undefined" en vez de rechazar la petición. Un DTO sin validar con
  // whitelist activo es peor que no tener DTO.
  @IsEnum(TripStatus, {
    message: `status debe ser uno de: ${Object.values(TripStatus).join(', ')}`,
  })
  status: TripStatus;
}

class TripLocationDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsOptional() @IsNumber() speed?: number;
}

@ApiTags('Trips')
@Controller('trips')
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  /** Publicar un viaje. El conductor sale del token, no del cuerpo. */
  @Post()
  create(@Request() req, @Body() dto: TripCreateDto) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Solo un conductor publica viajes');
    }
    return this.tripsService.create(dto, req.user.id);
  }

  /** Mis viajes como conductor — su panel. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@Request() req, @Query('status') status?: string) {
    return this.tripsService.findByDriver(req.user.id, status);
  }

  @Get()
  search(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('date') date: string,
    @Query('passengers') passengers?: number,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radius_km') radius_km?: number,
  ) {
    return this.tripsService.search({ origin, destination, date, passengers, lat, lng, radius_km });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tripsService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  cancel(@Request() req, @Param('id') id: string) {
    return this.tripsService.cancel(id, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id') id: string, @Body() dto: TripStatusDto) {
    return this.tripsService.updateStatus(id, dto.status, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/location')
  async updateLocation(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: TripLocationDto,
  ) {
    // Solo el conductor del viaje reporta su posición: si no, cualquiera
    // puede mover el punto del mapa que el pasajero está mirando.
    const trip: any = await this.tripsService.findById(id);
    if (!trip || trip.driver_id !== req.user.id) {
      throw new ForbiddenException('El viaje no es tuyo');
    }
    return this.tripsService.updateLocation(id, dto.lat, dto.lng, dto.speed);
  }
}
