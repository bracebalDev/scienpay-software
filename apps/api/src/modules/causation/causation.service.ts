import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import {
  causationBatches,
  causationItems,
  assignments,
  persons,
  projects,
  paymentGroups,
} from '../../infrastructure/database/schema.js';
import {
  PreviewCausationInput,
  GenerateCausationBatchInput,
  AnnulCausationBatchInput,
  CausationBatchStatus,
  CausationItemStatus,
  AssignmentStatus,
} from '@scienpay/shared';
import { CausationCalculator } from '../../domain/causation/causation-calculator.js';
import { eq, and } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

@Injectable()
export class CausationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async previewCausation(input: PreviewCausationInput) {
    const activeAssignments = await this.databaseService.db
      .select({
        assignmentId: assignments.id,
        personId: assignments.personId,
        personDoc: persons.documentNumber,
        personDocType: persons.documentType,
        personFirstName: persons.firstName,
        personLastName: persons.lastName,
        amountPerPeriod: assignments.amountPerPeriod,
        startDate: assignments.startDate,
        endDate: assignments.endDate,
      })
      .from(assignments)
      .innerJoin(persons, eq(assignments.personId, persons.id))
      .where(
        and(
          eq(assignments.projectId, input.projectId),
          eq(assignments.paymentGroupId, input.paymentGroupId),
          eq(assignments.status, AssignmentStatus.ACTIVO),
        ),
      );

    let totalCausation = new Decimal('0.00');
    const items = activeAssignments.map((asg) => {
      const calculation = CausationCalculator.calculateProration({
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        assignmentStartDate: asg.startDate,
        assignmentEndDate: asg.endDate,
        amountPerPeriod: asg.amountPerPeriod,
      });

      totalCausation = totalCausation.plus(calculation.calculatedAmount);

      return {
        assignmentId: asg.assignmentId,
        personId: asg.personId,
        beneficiaryName: `${asg.personFirstName} ${asg.personLastName}`,
        beneficiaryDocument: `${asg.personDocType}-${asg.personDoc}`,
        totalDaysInPeriod: calculation.totalDaysInPeriod,
        activeDays: calculation.activeDays,
        baseAmount: calculation.baseAmount,
        calculatedAmount: calculation.calculatedAmount,
      };
    });

    return {
      projectId: input.projectId,
      paymentGroupId: input.paymentGroupId,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
      itemsCount: items.length,
      totalCausationAmount: totalCausation.toFixed(2),
      items,
    };
  }

  async generateBatch(input: GenerateCausationBatchInput, userId: string) {
    // 1. Idempotencia: Verificar si ya existe lote para este corte exacto
    const existing = await this.databaseService.db
      .select({ id: causationBatches.id, status: causationBatches.status })
      .from(causationBatches)
      .where(
        and(
          eq(causationBatches.projectId, input.projectId),
          eq(causationBatches.paymentGroupId, input.paymentGroupId),
          eq(causationBatches.periodStartDate, input.periodStartDate),
          eq(causationBatches.periodEndDate, input.periodEndDate),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].status !== CausationBatchStatus.ANULADO) {
      throw new ConflictException(
        'CAUSACION_IDEMPOTENTE: Ya existe un lote de causación activo para este proyecto, grupo y período',
      );
    }

    // 2. Calcular los montos prorrateados
    const preview = await this.previewCausation(input);

    if (preview.items.length === 0) {
      throw new ConflictException('SIN_ASIGNACIONES: No existen asignaciones activas para generar la causación');
    }

    // 3. Insertar lote
    const [batch] = await this.databaseService.db
      .insert(causationBatches)
      .values({
        projectId: input.projectId,
        paymentGroupId: input.paymentGroupId,
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        totalCausationAmount: preview.totalCausationAmount,
        status: CausationBatchStatus.CALCULADO,
        calculatedByUserId: userId,
      })
      .returning();

    // 4. Insertar ítems de causación
    const itemsToInsert = preview.items.map((item) => ({
      batchId: batch.id,
      personId: item.personId,
      assignmentId: item.assignmentId,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
      totalDaysInPeriod: item.totalDaysInPeriod,
      activeDays: item.activeDays,
      baseAmount: item.baseAmount,
      calculatedAmount: item.calculatedAmount,
      paidAmount: '0.00',
      remainingDebt: item.calculatedAmount,
      status: CausationItemStatus.PENDIENTE,
    }));

    await this.databaseService.db.insert(causationItems).values(itemsToInsert);

    return {
      message: 'LOTE_CAUSACION_GENERADO_EXITOSAMENTE',
      batch,
      itemsCount: itemsToInsert.length,
    };
  }

  async listBatches(projectId?: string) {
    if (projectId) {
      return this.databaseService.db
        .select()
        .from(causationBatches)
        .where(eq(causationBatches.projectId, projectId))
        .orderBy(causationBatches.periodStartDate);
    }
    return this.databaseService.db.select().from(causationBatches).orderBy(causationBatches.periodStartDate);
  }

  async getBatchById(id: string) {
    const [batch] = await this.databaseService.db
      .select()
      .from(causationBatches)
      .where(eq(causationBatches.id, id))
      .limit(1);

    if (!batch) {
      throw new NotFoundException('LOTE_NO_ENCONTRADO: El lote de causación no existe');
    }

    const items = await this.databaseService.db
      .select()
      .from(causationItems)
      .where(eq(causationItems.batchId, id));

    return { ...batch, items };
  }
}
