import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  UserRole,
  createPettyCashSchema,
  openPettyCashPeriodSchema,
  requestPettyCashVoucherSchema,
  renderPettyCashVoucherSchema,
  type CreatePettyCashInput,
  type OpenPettyCashPeriodInput,
  type RequestPettyCashVoucherInput,
  type RenderPettyCashVoucherInput,
} from '@scienpay/shared';
import { PettyCashService } from './petty-cash.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('petty-cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listPettyCashes() {
    return this.pettyCashService.listPettyCashes();
  }

  @Get(':id/periods')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listPeriods(@UuidParam() id: string) {
    return this.pettyCashService.listPeriods(id);
  }

  @Get('periods/:periodId/vouchers')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listVouchers(@UuidParam('periodId') periodId: string) {
    return this.pettyCashService.listVouchers(periodId);
  }

  @Post()
  @Roles(UserRole.RECEPTOR)
  async createPettyCash(
    @Body(new ZodValidationPipe(createPettyCashSchema)) body: CreatePettyCashInput,
  ) {
    return this.pettyCashService.createPettyCash(body);
  }

  @Post(':id/periods')
  @Roles(UserRole.RECEPTOR)
  async openPeriod(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(openPettyCashPeriodSchema)) body: OpenPettyCashPeriodInput,
    @Req() req: any,
  ) {
    return this.pettyCashService.openPeriod(id, body, req.user.id);
  }

  @Post('periods/:periodId/vouchers')
  @Roles(UserRole.GENERADOR, UserRole.RECEPTOR)
  async requestVoucher(
    @UuidParam('periodId') periodId: string,
    @Body(new ZodValidationPipe(requestPettyCashVoucherSchema)) body: RequestPettyCashVoucherInput,
    @Req() req: any,
  ) {
    return this.pettyCashService.requestVoucher(periodId, body, req.user.fullName || 'Solicitante');
  }

  @Patch('vouchers/:id/approve')
  @Roles(UserRole.RECEPTOR)
  async approveVoucher(@UuidParam() id: string, @Req() req: any) {
    return this.pettyCashService.approveVoucher(id, req.user.id);
  }

  @Patch('vouchers/:id/disburse')
  @Roles(UserRole.RECEPTOR)
  async disburseVoucher(@UuidParam() id: string, @Req() req: any) {
    return this.pettyCashService.disburseVoucher(id, req.user.id);
  }

  @Patch('vouchers/:id/render')
  @Roles(UserRole.RECEPTOR)
  async renderVoucher(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(renderPettyCashVoucherSchema)) body: RenderPettyCashVoucherInput,
    @Req() req: any,
  ) {
    return this.pettyCashService.renderVoucher(id, body, req.user.id);
  }

  @Patch('periods/:periodId/close')
  @Roles(UserRole.RECEPTOR)
  async closePeriod(@UuidParam('periodId') periodId: string, @Req() req: any) {
    return this.pettyCashService.closePeriod(periodId, req.user.id);
  }
}
