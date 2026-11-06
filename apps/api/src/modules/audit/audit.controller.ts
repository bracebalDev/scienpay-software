import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@scienpay/shared';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async listLogs(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 100;
    return this.auditService.listLogs(lim);
  }
}
