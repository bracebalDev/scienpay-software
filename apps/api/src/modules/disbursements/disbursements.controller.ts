import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  UserRole,
  registerDisbursementSchema,
  type RegisterDisbursementInput,
} from '@scienpay/shared';
import { DisbursementsService } from './disbursements.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam, UuidQuery } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('disbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listDisbursements(@UuidQuery('requestId') requestId?: string) {
    return this.disbursementsService.listDisbursements(requestId);
  }

  @Get('receipts')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listReceipts(@UuidQuery('personId') personId?: string) {
    return this.disbursementsService.listReceipts(personId);
  }

  @Get('receipts/:id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getReceiptDetails(@UuidParam() id: string) {
    return this.disbursementsService.getReceiptDetails(id);
  }

  @Get('receipts/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async downloadReceiptPdf(@UuidParam() id: string, @Res() res: any) {
    const { buffer, filename } = await this.disbursementsService.generateReceiptPdfBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @Roles(UserRole.RECEPTOR)
  async registerDisbursement(
    @Body(new ZodValidationPipe(registerDisbursementSchema)) body: RegisterDisbursementInput,
    @Req() req: any,
  ) {
    return this.disbursementsService.registerDisbursement(body, req.user.id);
  }
}
