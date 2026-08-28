import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TripsModule } from './modules/trips/trips.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // La API arranca aunque la base de datos no esté disponible todavía,
    // para que el contrato (Swagger) sea consultable en cualquier momento.
    ...(process.env.DATABASE_URL
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres' as const,
            url: process.env.DATABASE_URL,
            autoLoadEntities: true,
            synchronize: process.env.NODE_ENV !== 'production',
            retryAttempts: 3,
          }),
        ]
      : []),
    AuthModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    IncidentsModule,
    ChatModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
