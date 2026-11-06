import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller.js';
import { PersonsService } from './persons.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
