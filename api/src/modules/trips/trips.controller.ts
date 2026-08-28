import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TripsService, TripSearchQuery } from './trips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

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

class TripStatusDto {
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
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
  @Post()
  create(@Body() dto: TripCreateDto) {
    return this.tripsService.create(dto);
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
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<TripCreateDto>) {
    // TODO: Implementar
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.tripsService.cancel(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: TripStatusDto) {
    return this.tripsService.updateStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/location')
  updateLocation(@Param('id') id: string, @Body() dto: TripLocationDto) {
    return this.tripsService.updateLocation(id, dto.lat, dto.lng, dto.speed);
  }
}
