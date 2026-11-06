import { Module } from '@nestjs/common';
import { CausationController } from './causation.controller.js';
import { CausationService } from './causation.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [CausationController],
  providers: [CausationService],
  exports: [CausationService],
})
export class CausationModule {}
