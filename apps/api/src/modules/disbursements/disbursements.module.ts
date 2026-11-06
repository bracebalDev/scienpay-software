import { Module } from '@nestjs/common';
import { DisbursementsController } from './disbursements.controller.js';
import { DisbursementsService } from './disbursements.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [DisbursementsController],
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
