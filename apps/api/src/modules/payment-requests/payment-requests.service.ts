import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import {
  paymentRequests,
  causationBatches,
  causationItems,
  persons,
  projects,
  users,
} from '../../infrastructure/database/schema.js';
import {
  CreatePaymentRequestInput,
  RejectPaymentRequestInput,
  PaymentRequestStatus,
  CausationBatchStatus,
  UserRole,
} from '@scienpay/shared';
import { PaymentRequestStateMachine } from '../../domain/payment-requests/payment-request-state-machine.js';
import { RolePermissionsPolicy } from '../../domain/security/role-permissions.policy.js';
import { PdfReceiptGenerator } from '../../infrastructure/pdf/pdf-receipt.generator.js';
import { FinancialImmutabilityEngine } from '../../domain/financial/financial-immutability.engine.js';
import { eq, desc, sql } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

@Injectable()
export class PaymentRequestsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Traduce una transición inválida de la máquina de estados a un 409.
   * `PaymentRequestStateMachine` es dominio puro y lanza un `Error` genérico;
   * sin esta traducción el borde HTTP devolvía 500 en lugar de 409.
   */
  private assertTransition(current: PaymentRequestStatus, target: PaymentRequestStatus): void {
    if (!PaymentRequestStateMachine.canTransition(current, target)) {
      throw new ConflictException(
        `TRANSICION_ESTADO_INVALIDA: No es posible transicionar la solicitud desde '${current}' hacia '${target}'`,
      );
    }
  }

  async listRequests(projectId?: string) {
    if (projectId) {
      return this.databaseService.db
        .select()
        .from(paymentRequests)
        .where(eq(paymentRequests.projectId, projectId))
        .orderBy(desc(paymentRequests.createdAt));
    }
    return this.databaseService.db
      .select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.createdAt));
  }

  async getRequestById(id: string) {
    const [request] = await this.databaseService.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id))
      .limit(1);

    if (!request) {
      throw new NotFoundException('SOLICITUD_NO_ENCONTRADA: La solicitud de pago no existe');
    }
    return request;
  }

  /**
   * PDF consolidado de la solicitud (HANDOFF 2.3).
   * Incluye cabecera, beneficiarios del lote, causado/pagado/pendiente,
   * totales y firmas. Las cifras se recalculan desde la BD en el momento.
   */
  async generateRequestPdfBuffer(requestId: string): Promise<{ buffer: Buffer; filename: string }> {
    const request = await this.getRequestById(requestId);

    const [project] = await this.databaseService.db
      .select()
      .from(projects)
      .where(eq(projects.id, request.projectId))
      .limit(1);

    const [creator] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, request.createdByUserId))
      .limit(1);

    const [reviewer] = request.reviewedByUserId
      ? await this.databaseService.db
          .select()
          .from(users)
          .where(eq(users.id, request.reviewedByUserId))
          .limit(1)
      : [];

    const items = await this.databaseService.db
      .select({
        periodStartDate: causationItems.periodStartDate,
        periodEndDate: causationItems.periodEndDate,
        calculatedAmount: causationItems.calculatedAmount,
        paidAmount: causationItems.paidAmount,
        remainingDebt: causationItems.remainingDebt,
        status: causationItems.status,
        firstName: persons.firstName,
        lastName: persons.lastName,
        documentType: persons.documentType,
        documentNumber: persons.documentNumber,
      })
      .from(causationItems)
      .innerJoin(persons, eq(causationItems.personId, persons.id))
      .where(eq(causationItems.batchId, request.causationBatchId))
      .orderBy(causationItems.periodStartDate, persons.lastName);

    let totalCalculated = new Decimal('0.00');
    let totalPaid = new Decimal('0.00');
    let totalRemaining = new Decimal('0.00');

    const pdfItems = items.map((item) => {
      totalCalculated = totalCalculated.plus(item.calculatedAmount);
      totalPaid = totalPaid.plus(item.paidAmount);
      totalRemaining = totalRemaining.plus(item.remainingDebt);

      return {
        beneficiaryName: `${item.firstName} ${item.lastName}`,
        beneficiaryDocument: `${item.documentType}-${item.documentNumber}`,
        period: `${item.periodStartDate} al ${item.periodEndDate}`,
        calculatedAmountUSD: item.calculatedAmount,
        paidAmountUSD: item.paidAmount,
        remainingDebtUSD: item.remainingDebt,
        status: item.status,
      };
    });

    const buffer = await PdfReceiptGenerator.generatePaymentRequestPdf({
      requestCode: request.requestCode,
      issuedDate: new Date(request.createdAt).toISOString().split('T')[0],
      projectName: project ? `${project.name} (${project.code})` : 'Proyecto Científico',
      periodDescription: request.periodDescription,
      status: request.status,
      totalAmountUSD: request.totalAmountUSD,
      createdByName: creator ? creator.fullName : 'Generador de Nómina',
      reviewedByName: reviewer ? reviewer.fullName : '',
      items: pdfItems,
      totalCalculatedUSD: totalCalculated.toFixed(2),
      totalPaidUSD: totalPaid.toFixed(2),
      totalRemainingUSD: totalRemaining.toFixed(2),
    });

    return {
      buffer,
      filename: `${request.requestCode}.pdf`,
    };
  }

  async createRequest(input: CreatePaymentRequestInput, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      // 1. Obtener lote de causación
      const [batch] = await tx
        .select()
        .from(causationBatches)
        .where(eq(causationBatches.id, input.causationBatchId))
        .limit(1);

      if (!batch) {
        throw new NotFoundException('LOTE_NO_ENCONTRADO: El lote de causación no existe');
      }

      // 2. Un lote anulado no puede originar nuevas solicitudes.
      if (batch.status === CausationBatchStatus.ANULADO) {
        throw new ConflictException(
          'LOTE_ANULADO: No se puede crear una solicitud a partir de un lote de causación anulado',
        );
      }

      // 3. El lote debe pertenecer al proyecto indicado en la solicitud.
      if (batch.projectId !== input.projectId) {
        throw new ConflictException(
          'PROYECTO_INCOMPATIBLE: El lote de causación no pertenece al proyecto indicado',
        );
      }

      // 4. El monto solicitado no puede exceder el total causado del lote.
      const requestedAmount = new Decimal(input.requestedAmount);
      const totalCausation = new Decimal(batch.totalCausationAmount);

      if (requestedAmount.greaterThan(totalCausation)) {
        throw new ConflictException(
          'MONTO_EXCEDE_CAUSACION: El monto solicitado no puede exceder el total causado del lote',
        );
      }

      // 5. Reservar código correlativo de solicitud dentro de la transacción (sin huecos por rollback)
      const year = new Date().getFullYear();
      const seqResult = await tx.execute(sql`SELECT next_request_number(${year}) AS next_number`);
      const nextSequenceNum = Number((seqResult as any)[0]?.next_number ?? 0);

      if (!Number.isFinite(nextSequenceNum) || nextSequenceNum <= 0) {
        throw new ConflictException(
          'SECUENCIA_SOLICITUD_INVALIDA: No se pudo reservar el número de solicitud',
        );
      }

      const requestCode = FinancialImmutabilityEngine.formatRequestCode(year, nextSequenceNum);

      const [created] = await tx
        .insert(paymentRequests)
        .values({
          requestCode,
          projectId: input.projectId,
          causationBatchId: input.causationBatchId,
          periodDescription:
            input.periodDescription || `${batch.periodStartDate} al ${batch.periodEndDate}`,
          totalAmountUSD: requestedAmount.toFixed(2),
          status: PaymentRequestStatus.BORRADOR,
          createdByUserId: userId,
          notes: input.notes?.trim() || null,
        })
        .returning();

      return created;
    });
  }

  async sendRequest(id: string, _userId: string) {
    const request = await this.getRequestById(id);

    this.assertTransition(request.status as PaymentRequestStatus, PaymentRequestStatus.ENVIADA);

    const [updated] = await this.databaseService.db
      .update(paymentRequests)
      .set({
        status: PaymentRequestStatus.ENVIADA,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    return updated;
  }

  async approveRequest(id: string, reviewerUserId: string, reviewerRole: UserRole) {
    const request = await this.getRequestById(id);

    // 1. REGLA DE CUATRO OJOS (ADR-006 & Especificación)
    const canApprove = RolePermissionsPolicy.canApproveRequest(
      request.createdByUserId,
      reviewerUserId,
      reviewerRole,
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'REGLA_CUATRO_OJOS_VIOLADA: El creador de la solicitud no puede ser su propio aprobador. Debe aprobar un Receptor independiente.',
      );
    }

    // 2. Transición válida
    this.assertTransition(request.status as PaymentRequestStatus, PaymentRequestStatus.APROBADA);

    const [updated] = await this.databaseService.db
      .update(paymentRequests)
      .set({
        status: PaymentRequestStatus.APROBADA,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    return updated;
  }

  async rejectRequest(
    id: string,
    reviewerUserId: string,
    reviewerRole: UserRole,
    input: RejectPaymentRequestInput,
  ) {
    const request = await this.getRequestById(id);

    if (reviewerRole !== UserRole.RECEPTOR) {
      throw new ForbiddenException('ACCESO_DENEGADO: Solo el Receptor puede rechazar solicitudes');
    }

    this.assertTransition(request.status as PaymentRequestStatus, PaymentRequestStatus.RECHAZADA);

    const [updated] = await this.databaseService.db
      .update(paymentRequests)
      .set({
        status: PaymentRequestStatus.RECHAZADA,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    return updated;
  }

  async closeRequest(id: string) {
    const request = await this.getRequestById(id);

    this.assertTransition(request.status as PaymentRequestStatus, PaymentRequestStatus.CERRADA);

    const [updated] = await this.databaseService.db
      .update(paymentRequests)
      .set({
        status: PaymentRequestStatus.CERRADA,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    return updated;
  }
}
