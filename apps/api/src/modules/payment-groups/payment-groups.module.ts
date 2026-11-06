import { Module } from '@nestjs/common';
import { PaymentGroupsController } from './payment-groups.controller.js';
import { PaymentGroupsService } from './payment-groups.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [PaymentGroupsController],
  providers: [PaymentGroupsService],
  exports: [PaymentGroupsService],
})
export class PaymentGroupsModule {}
