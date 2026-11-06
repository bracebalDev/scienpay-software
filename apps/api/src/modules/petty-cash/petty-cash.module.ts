import { Module } from '@nestjs/common';
import { PettyCashController } from './petty-cash.controller.js';
import { PettyCashService } from './petty-cash.service.js';
import { AuthModule } from '../../infrastructure/auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [PettyCashController],
  providers: [PettyCashService],
  exports: [PettyCashService],
})
export class PettyCashModule {}
