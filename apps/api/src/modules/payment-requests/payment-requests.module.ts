import { Module } from '@nestjs/common';
import { PaymentRequestsController } from './payment-requests.controller.js';
import { PaymentRequestsService } from './payment-requests.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [PaymentRequestsController],
  providers: [PaymentRequestsService],
  exports: [PaymentRequestsService],
})
export class PaymentRequestsModule {}
