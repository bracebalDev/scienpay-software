import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from '../../domain/security/password.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, PasswordService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
