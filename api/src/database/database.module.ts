import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

/** Global: media app necesita la base y no aporta nada re-importarla. */
@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DatabaseModule {}
