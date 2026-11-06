import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  UserRole,
  createPaymentRequestSchema,
  rejectPaymentRequestSchema,
} from '@scienpay/shared';
import { PaymentRequestsService } from './payment-requests.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('payment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentRequestsController {
  constructor(private readonly paymentRequestsService: PaymentRequestsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listRequests(@Query('projectId') projectId?: string) {
    return this.paymentRequestsService.listRequests(projectId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getRequestById(@Param('id') id: string) {
    return this.paymentRequestsService.getRequestById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createRequest(@Body() body: unknown, @Req() req: any) {
    const parsed = createPaymentRequestSchema.parse(body);
    return this.paymentRequestsService.createRequest(parsed, req.user.id);
  }

  @Patch(':id/send')
  @Roles(UserRole.GENERADOR)
  async sendRequest(@Param('id') id: string, @Req() req: any) {
    return this.paymentRequestsService.sendRequest(id, req.user.id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.RECEPTOR)
  async approveRequest(@Param('id') id: string, @Req() req: any) {
    return this.paymentRequestsService.approveRequest(id, req.user.id, req.user.role);
  }

  @Patch(':id/reject')
  @Roles(UserRole.RECEPTOR)
  async rejectRequest(@Param('id') id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = rejectPaymentRequestSchema.parse(body);
    return this.paymentRequestsService.rejectRequest(id, req.user.id, req.user.role, parsed);
  }

  @Patch(':id/close')
  @Roles(UserRole.RECEPTOR)
  async closeRequest(@Param('id') id: string) {
    return this.paymentRequestsService.closeRequest(id);
  }
}
