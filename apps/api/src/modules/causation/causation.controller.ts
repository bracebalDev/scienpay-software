import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole, previewCausationSchema, generateCausationBatchSchema } from '@scienpay/shared';
import { CausationService } from './causation.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('causation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CausationController {
  constructor(private readonly causationService: CausationService) {}

  @Post('preview')
  @Roles(UserRole.GENERADOR)
  async previewCausation(@Body() body: unknown) {
    const parsed = previewCausationSchema.parse(body);
    return this.causationService.previewCausation(parsed);
  }

  @Post('generate')
  @Roles(UserRole.GENERADOR)
  async generateBatch(@Body() body: unknown, @Req() req: any) {
    const parsed = generateCausationBatchSchema.parse(body);
    return this.causationService.generateBatch(parsed, req.user.id);
  }

  @Get('batches')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listBatches(@Query('projectId') projectId?: string) {
    return this.causationService.listBatches(projectId);
  }

  @Get('batches/:id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getBatchById(@Param('id') id: string) {
    return this.causationService.getBatchById(id);
  }
}
