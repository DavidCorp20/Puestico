import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
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
    // La API arranca aunque la base no responda: el contrato (Swagger)
    // queda consultable y /api/health dice "degraded" en vez de que el
    // proceso muera en el arranque. Los endpoints que leen datos
    // devuelven 503, que es la verdad.
    //
    // Se usa SQL directo y no un ORM con `synchronize`: el esquema
    // versionado en database/migrations es la fuente de verdad, y
    // `synchronize` en producción puede borrar una columna con datos.
    DatabaseModule,
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
