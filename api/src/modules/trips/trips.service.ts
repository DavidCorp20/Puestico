import { Injectable } from '@nestjs/common';

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

@Injectable()
export class TripsService {
  // TODO: Inyectar repositorio TypeORM

  async search(query: TripSearchQuery): Promise<any[]> {
    // TODO: Implementar búsqueda con PostGIS
    // SELECT * FROM trips
    // WHERE origin ILIKE %origin% AND destination ILIKE %destination%
    //   AND departure_date = date AND status = 'scheduled' AND seats_available >= passengers
    //   AND ST_DWithin(origin_coords, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
    // ORDER BY departure_time ASC
    return [];
  }

  async findById(id: string): Promise<Trip | null> {
    // TODO: Implementar
    return null;
  }

  async create(data: Partial<Trip>): Promise<Trip> {
    // TODO: Implementar
    return data as Trip;
  }

  async updateStatus(id: string, status: Trip['status']): Promise<void> {
    // TODO: Implementar
  }

  async updateLocation(id: string, lat: number, lng: number, speed?: number): Promise<void> {
    // TODO: INSERT INTO trip_locations
  }

  async cancel(id: string): Promise<void> {
    // TODO: Marcar como cancelled, reembolsar reservas
  }
}
