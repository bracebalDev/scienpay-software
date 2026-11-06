import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import {
  disbursements,
  paymentRequests,
  causationItems,
  receipts,
  receiptAllocations,
} from '../../infrastructure/database/schema.js';
import {
  RegisterDisbursementInput,
  PaymentRequestStatus,
  CausationItemStatus,
} from '@scienpay/shared';
import { FIFOAllocationEngine } from '../../domain/payments/fifo-allocation.engine.js';
import { FinancialImmutabilityEngine } from '../../domain/financial/financial-immutability.engine.js';
import { PaymentRequestStateMachine } from '../../domain/payment-requests/payment-request-state-machine.js';
import { eq, and, sql } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

@Injectable()
export class DisbursementsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listDisbursements(requestId?: string) {
    if (requestId) {
      return this.databaseService.db
        .select()
        .from(disbursements)
        .where(eq(disbursements.paymentRequestId, requestId))
        .orderBy(disbursements.createdAt);
    }
    return this.databaseService.db.select().from(disbursements).orderBy(disbursements.createdAt);
  }

  async listReceipts(personId?: string) {
    if (personId) {
      return this.databaseService.db
        .select()
        .from(receipts)
        .where(eq(receipts.personId, personId))
        .orderBy(receipts.issuedAt);
    }
    return this.databaseService.db.select().from(receipts).orderBy(receipts.issuedAt);
  }

  async getReceiptDetails(receiptId: string) {
    const [receipt] = await this.databaseService.db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (!receipt) {
      throw new NotFoundException('RECIBO_NO_ENCONTRADO');
    }

    const allocations = await this.databaseService.db
      .select()
      .from(receiptAllocations)
      .where(eq(receiptAllocations.receiptId, receiptId));

    return { ...receipt, allocations };
  }

  async registerDisbursement(input: RegisterDisbursementInput, userId: string) {
    if (!input.paymentRequestId) {
      throw new ConflictException('ID_SOLICITUD_REQUERIDO: Se debe especificar el ID de la solicitud de pago');
    }

    // 1. Obtener solicitud de pago
    const [request] = await this.databaseService.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, input.paymentRequestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException('SOLICITUD_NO_ENCONTRADA: La solicitud no existe');
    }

    if (request.status !== PaymentRequestStatus.APROBADA) {
      throw new ConflictException(
        `ESTADO_INVALIDO: Solo se puede registrar entrega de fondos para solicitudes en estado 'APROBADA'. Estado actual: '${request.status}'`,
      );
    }

    // 2. Calcular total a desembolsar
    let totalDisbursed = new Decimal('0.00');
    for (const alloc of input.allocations) {
      totalDisbursed = totalDisbursed.plus(alloc.amount);
    }

    // 3. Crear desembolso
    const [disbursement] = await this.databaseService.db
      .insert(disbursements)
      .values({
        paymentRequestId: request.id,
        disbursedByUserId: userId,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber || '',
        totalAmount: totalDisbursed.toFixed(2),
        notes: input.notes || '',
      })
      .returning();

    const issuedReceipts = [];
    const currentYear = new Date().getFullYear();

    // 4. Por cada persona beneficiaria, aplicar algoritmo FIFO
    for (const personAlloc of input.allocations) {
      // Buscar causaciones pendientes de la persona en el proyecto
      const pendingItems = await this.databaseService.db
        .select({
          id: causationItems.id,
          periodStartDate: causationItems.periodStartDate,
          calculatedAmount: causationItems.calculatedAmount,
          paidAmount: causationItems.paidAmount,
          remainingDebt: causationItems.remainingDebt,
        })
        .from(causationItems)
        .where(
          and(
            eq(causationItems.personId, personAlloc.personId),
            sql`${causationItems.status} IN ('PENDIENTE', 'PAGADO_PARCIAL')`,
          ),
        )
        .orderBy(causationItems.periodStartDate);

      // Aplicar motor de amortización FIFO puro (valida que monto <= deuda)
      const fifoResult = FIFOAllocationEngine.allocatePayment(
        pendingItems,
        personAlloc.amount,
      );

      // Obtener siguiente número de secuencia para el recibo
      const seqResult = await this.databaseService.db.execute(
        sql`SELECT nextval('receipt_number_seq') AS next_val`,
      );
      const nextSequenceNum = Number(seqResult[0]?.next_val || 1);
      const receiptNumber = FinancialImmutabilityEngine.formatReceiptNumber(
        currentYear,
        nextSequenceNum,
      );

      // Crear recibo inmutable
      const [receipt] = await this.databaseService.db
        .insert(receipts)
        .values({
          receiptNumber,
          disbursementId: disbursement.id,
          personId: personAlloc.personId,
          projectId: request.projectId,
          totalAmountUSD: fifoResult.totalAllocatedUSD,
          remainingDebtAfterUSD: fifoResult.remainingDebtAfterUSD,
          issuedByUserId: userId,
          notes: input.notes || '',
        })
        .returning();

      // Guardar imputaciones y actualizar causaciones
      for (const itemAlloc of fifoResult.allocations) {
        await this.databaseService.db.insert(receiptAllocations).values({
          receiptId: receipt.id,
          causationItemId: itemAlloc.causationItemId,
          allocatedAmountUSD: itemAlloc.allocatedAmountUSD,
          debtBeforeAllocationUSD: itemAlloc.debtBeforeAllocationUSD,
          debtAfterAllocationUSD: itemAlloc.debtAfterAllocationUSD,
        });

        await this.databaseService.db
          .update(causationItems)
          .set({
            paidAmount: itemAlloc.newPaidAmountUSD,
            remainingDebt: itemAlloc.newRemainingDebtUSD,
            status: itemAlloc.newStatus,
          })
          .where(eq(causationItems.id, itemAlloc.causationItemId));
      }

      issuedReceipts.push(receipt);
    }

    // 5. Transición de estado de la solicitud a ENTREGADA
    PaymentRequestStateMachine.assertValidTransition(
      request.status as PaymentRequestStatus,
      PaymentRequestStatus.ENTREGADA,
    );

    await this.databaseService.db
      .update(paymentRequests)
      .set({
        status: PaymentRequestStatus.ENTREGADA,
        updatedAt: new Date(),
      })
      .where(eq(paymentRequests.id, request.id));

    return {
      message: 'DESEMBOLSO_REGISTRADO_EXITOSAMENTE',
      disbursement,
      receipts: issuedReceipts,
    };
  }
}
