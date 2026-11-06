import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole, createPaymentGroupSchema } from '@scienpay/shared';
import { PaymentGroupsService } from './payment-groups.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('payment-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentGroupsController {
  constructor(private readonly paymentGroupsService: PaymentGroupsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listPaymentGroups() {
    return this.paymentGroupsService.listPaymentGroups();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getPaymentGroupById(@Param('id') id: string) {
    return this.paymentGroupsService.getPaymentGroupById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR)
  async createPaymentGroup(@Body() body: unknown) {
    const parsed = createPaymentGroupSchema.parse(body);
    return this.paymentGroupsService.createPaymentGroup(parsed);
  }
}
