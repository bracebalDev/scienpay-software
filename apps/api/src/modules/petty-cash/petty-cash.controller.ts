import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  UserRole,
  createPettyCashSchema,
  openPettyCashPeriodSchema,
  requestPettyCashVoucherSchema,
  renderPettyCashVoucherSchema,
} from '@scienpay/shared';
import { PettyCashService } from './petty-cash.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('petty-cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listPettyCashes() {
    return this.pettyCashService.listPettyCashes();
  }

  @Post()
  @Roles(UserRole.RECEPTOR)
  async createPettyCash(@Body() body: unknown) {
    const parsed = createPettyCashSchema.parse(body);
    return this.pettyCashService.createPettyCash(parsed);
  }

  @Post(':id/periods')
  @Roles(UserRole.RECEPTOR)
  async openPeriod(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = openPettyCashPeriodSchema.parse(body);
    return this.pettyCashService.openPeriod(id, parsed, req.user.id);
  }

  @Post('periods/:periodId/vouchers')
  @Roles(UserRole.GENERADOR, UserRole.RECEPTOR)
  async requestVoucher(
    @Param('periodId') periodId: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const parsed = requestPettyCashVoucherSchema.parse(body);
    return this.pettyCashService.requestVoucher(periodId, parsed, req.user.fullName || 'Solicitante');
  }

  @Patch('vouchers/:id/approve')
  @Roles(UserRole.RECEPTOR)
  async approveVoucher(@Param('id') id: string, @Req() req: any) {
    return this.pettyCashService.approveVoucher(id, req.user.id);
  }

  @Patch('vouchers/:id/disburse')
  @Roles(UserRole.RECEPTOR)
  async disburseVoucher(@Param('id') id: string, @Req() req: any) {
    return this.pettyCashService.disburseVoucher(id, req.user.id);
  }

  @Patch('vouchers/:id/render')
  @Roles(UserRole.RECEPTOR)
  async renderVoucher(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = renderPettyCashVoucherSchema.parse(body);
    return this.pettyCashService.renderVoucher(id, parsed, req.user.id);
  }

  @Patch('periods/:periodId/close')
  @Roles(UserRole.RECEPTOR)
  async closePeriod(@Param('periodId') periodId: string, @Req() req: any) {
    return this.pettyCashService.closePeriod(periodId, req.user.id);
  }
}
