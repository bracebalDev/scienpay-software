import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole, auditQuerySchema, type AuditQueryInput } from '@scienpay/shared';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async listLogs(@Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQueryInput) {
    return this.auditService.listLogs(query);
  }
}
