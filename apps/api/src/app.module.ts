import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AuthModule } from './infrastructure/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { PersonsModule } from './modules/persons/persons.module.js';
import { PaymentGroupsModule } from './modules/payment-groups/payment-groups.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { CausationModule } from './modules/causation/causation.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    PersonsModule,
    PaymentGroupsModule,
    AssignmentsModule,
    CausationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
