import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  UserRole,
  createPaymentRequestSchema,
  rejectPaymentRequestSchema,
  type CreatePaymentRequestInput,
  type RejectPaymentRequestInput,
} from '@scienpay/shared';
import { PaymentRequestsService } from './payment-requests.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam, UuidQuery } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('payment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentRequestsController {
  constructor(private readonly paymentRequestsService: PaymentRequestsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listRequests(@UuidQuery('projectId') projectId?: string) {
    return this.paymentRequestsService.listRequests(projectId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getRequestById(@UuidParam() id: string) {
    return this.paymentRequestsService.getRequestById(id);
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async downloadRequestPdf(@UuidParam() id: string, @Res() res: any) {
    const { buffer, filename } = await this.paymentRequestsService.generateRequestPdfBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createRequest(
    @Body(new ZodValidationPipe(createPaymentRequestSchema)) body: CreatePaymentRequestInput,
    @Req() req: any,
  ) {
    return this.paymentRequestsService.createRequest(body, req.user.id);
  }

  @Patch(':id/send')
  @Roles(UserRole.GENERADOR)
  async sendRequest(@UuidParam() id: string, @Req() req: any) {
    return this.paymentRequestsService.sendRequest(id, req.user.id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.RECEPTOR)
  async approveRequest(@UuidParam() id: string, @Req() req: any) {
    return this.paymentRequestsService.approveRequest(id, req.user.id, req.user.role);
  }

  @Patch(':id/reject')
  @Roles(UserRole.RECEPTOR)
  async rejectRequest(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(rejectPaymentRequestSchema)) body: RejectPaymentRequestInput,
    @Req() req: any,
  ) {
    return this.paymentRequestsService.rejectRequest(id, req.user.id, req.user.role, body);
  }

  @Patch(':id/close')
  @Roles(UserRole.RECEPTOR)
  async closeRequest(@UuidParam() id: string) {
    return this.paymentRequestsService.closeRequest(id);
  }
}
