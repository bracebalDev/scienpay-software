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
  projects,
} from '../../infrastructure/database/schema.js';
import {
  CreatePaymentRequestInput,
  RejectPaymentRequestInput,
  PaymentRequestStatus,
  UserRole,
} from '@scienpay/shared';
import { PaymentRequestStateMachine } from '../../domain/payment-requests/payment-request-state-machine.js';
import { RolePermissionsPolicy } from '../../domain/security/role-permissions.policy.js';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class PaymentRequestsService {
  constructor(private readonly databaseService: DatabaseService) {}

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

  async createRequest(input: CreatePaymentRequestInput, userId: string) {
    // 1. Obtener lote de causación
    const [batch] = await this.databaseService.db
      .select()
      .from(causationBatches)
      .where(eq(causationBatches.id, input.causationBatchId))
      .limit(1);

    if (!batch) {
      throw new NotFoundException('LOTE_NO_ENCONTRADO: El lote de causación no existe');
    }

    // 2. Generar código correlativo de solicitud: SOL-YYYY-NNN
    const year = new Date().getFullYear();
    const countResult = await this.databaseService.db
      .select({ id: paymentRequests.id })
      .from(paymentRequests);
    const nextNum = (countResult.length + 1).toString().padStart(3, '0');
    const requestCode = `SOL-${year}-${nextNum}`;

    const [created] = await this.databaseService.db
      .insert(paymentRequests)
      .values({
        requestCode,
        projectId: input.projectId,
        causationBatchId: input.causationBatchId,
        periodDescription: input.periodDescription || `${batch.periodStartDate} al ${batch.periodEndDate}`,
        totalAmountUSD: batch.totalCausationAmount,
        status: PaymentRequestStatus.BORRADOR,
        createdByUserId: userId,
      })
      .returning();

    return created;
  }

  async sendRequest(id: string, userId: string) {
    const request = await this.getRequestById(id);

    PaymentRequestStateMachine.assertValidTransition(
      request.status as PaymentRequestStatus,
      PaymentRequestStatus.ENVIADA,
    );

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
    PaymentRequestStateMachine.assertValidTransition(
      request.status as PaymentRequestStatus,
      PaymentRequestStatus.APROBADA,
    );

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

    PaymentRequestStateMachine.assertValidTransition(
      request.status as PaymentRequestStatus,
      PaymentRequestStatus.RECHAZADA,
    );

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

    PaymentRequestStateMachine.assertValidTransition(
      request.status as PaymentRequestStatus,
      PaymentRequestStatus.CERRADA,
    );

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
