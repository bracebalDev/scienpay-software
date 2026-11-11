import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  UserRole,
  previewCausationSchema,
  generateCausationBatchSchema,
  annulCausationBatchSchema,
  type PreviewCausationInput,
  type GenerateCausationBatchInput,
  type AnnulCausationBatchInput,
} from '@scienpay/shared';
import { CausationService } from './causation.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam, UuidQuery } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('causation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CausationController {
  constructor(private readonly causationService: CausationService) {}

  @Post('preview')
  @Roles(UserRole.GENERADOR)
  async previewCausation(
    @Body(new ZodValidationPipe(previewCausationSchema)) body: PreviewCausationInput,
  ) {
    return this.causationService.previewCausation(body);
  }

  @Post('generate')
  @Roles(UserRole.GENERADOR)
  async generateBatch(
    @Body(new ZodValidationPipe(generateCausationBatchSchema)) body: GenerateCausationBatchInput,
    @Req() req: any,
  ) {
    return this.causationService.generateBatch(body, req.user.id);
  }

  @Get('batches')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listBatches(@UuidQuery('projectId') projectId?: string) {
    return this.causationService.listBatches(projectId);
  }

  @Get('batches/:id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getBatchById(@UuidParam() id: string) {
    return this.causationService.getBatchById(id);
  }

  @Post('batches/:id/annul')
  @Roles(UserRole.GENERADOR)
  async annulBatch(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(annulCausationBatchSchema)) body: AnnulCausationBatchInput,
    @Req() req: any,
  ) {
    return this.causationService.annulBatch(
      id,
      body,
      { id: req.user.id, email: req.user.email, role: req.user.role },
      req.ip,
    );
  }
}
