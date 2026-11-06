import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole, registerDisbursementSchema } from '@scienpay/shared';
import { DisbursementsService } from './disbursements.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

@Controller('disbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listDisbursements(@Query('requestId') requestId?: string) {
    return this.disbursementsService.listDisbursements(requestId);
  }

  @Get('receipts')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listReceipts(@Query('personId') personId?: string) {
    return this.disbursementsService.listReceipts(personId);
  }

  @Get('receipts/:id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getReceiptDetails(@Param('id') id: string) {
    return this.disbursementsService.getReceiptDetails(id);
  }

  @Post()
  @Roles(UserRole.RECEPTOR)
  async registerDisbursement(@Body() body: unknown, @Req() req: any) {
    const parsed = registerDisbursementSchema.parse(body);
    return this.disbursementsService.registerDisbursement(parsed, req.user.id);
  }
}
