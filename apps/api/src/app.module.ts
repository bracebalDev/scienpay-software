import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AuthModule } from './infrastructure/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
