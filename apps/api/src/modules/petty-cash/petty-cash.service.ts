import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import {
  pettyCash,
  pettyCashProjects,
  pettyCashPeriods,
  pettyCashVouchers,
  pettyCashMovements,
  projects,
} from '../../infrastructure/database/schema.js';
import {
  CreatePettyCashInput,
  OpenPettyCashPeriodInput,
  RequestPettyCashVoucherInput,
  RenderPettyCashVoucherInput,
  PettyCashStatus,
  PettyCashPeriodStatus,
  PettyCashVoucherStatus,
  PettyCashMovementType,
} from '@scienpay/shared';
import { PettyCashLedgerEngine } from '../../domain/petty-cash/petty-cash-ledger.engine.js';
import { eq, and, or, desc, inArray, sql } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

const PENDING_VOUCHER_STATUSES = [
  PettyCashVoucherStatus.SOLICITADO,
  PettyCashVoucherStatus.APROBADO,
  PettyCashVoucherStatus.DESEMBOLSADO,
];

@Injectable()
export class PettyCashService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPettyCashes() {
    return this.databaseService.db.select().from(pettyCash).orderBy(pettyCash.name);
  }

  async listPeriods(pettyCashId: string) {
    const [cash] = await this.databaseService.db
      .select({ id: pettyCash.id })
      .from(pettyCash)
      .where(eq(pettyCash.id, pettyCashId))
      .limit(1);

    if (!cash) {
      throw new NotFoundException('CAJA_NO_ENCONTRADA: La caja chica no existe');
    }

    return this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.pettyCashId, pettyCashId))
      .orderBy(desc(pettyCashPeriods.periodYear), desc(pettyCashPeriods.periodMonth));
  }

  async listVouchers(periodId: string) {
    const [period] = await this.databaseService.db
      .select({ id: pettyCashPeriods.id })
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.id, periodId))
      .limit(1);

    if (!period) {
      throw new NotFoundException('PERIODO_NO_ENCONTRADO: El período de caja chica no existe');
    }

    return this.databaseService.db
      .select()
      .from(pettyCashVouchers)
      .where(eq(pettyCashVouchers.pettyCashPeriodId, periodId))
      .orderBy(desc(pettyCashVouchers.createdAt));
  }

  async createPettyCash(input: CreatePettyCashInput) {
    const uniqueProjectIds = [...new Set(input.projectIds)];

    return this.databaseService.db.transaction(async (tx) => {
      const existingProjects = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(inArray(projects.id, uniqueProjectIds));

      if (existingProjects.length !== uniqueProjectIds.length) {
        const found = new Set(existingProjects.map((project) => project.id));
        const missing = uniqueProjectIds.filter((id) => !found.has(id));
        throw new NotFoundException(
          `PROYECTO_NO_ENCONTRADO: Los siguientes proyectos no existen: ${missing.join(', ')}`,
        );
      }

      const [created] = await tx
        .insert(pettyCash)
        .values({
          name: input.name,
          description: input.description || '',
          custodianName: input.custodianName,
          status: PettyCashStatus.ACTIVA,
        })
        .returning();

      for (const projectId of uniqueProjectIds) {
        await tx.insert(pettyCashProjects).values({
          pettyCashId: created.id,
          projectId,
        });
      }

      return created;
    });
  }

  async openPeriod(pettyCashId: string, input: OpenPettyCashPeriodInput, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [cash] = await tx
        .select()
        .from(pettyCash)
        .where(eq(pettyCash.id, pettyCashId))
        .limit(1)
        .for('update');

      if (!cash) {
        throw new NotFoundException('CAJA_NO_ENCONTRADA: La caja chica no existe');
      }

      if (cash.status !== PettyCashStatus.ACTIVA) {
        throw new ConflictException('CAJA_INACTIVA: No se pueden abrir períodos en una caja chica inactiva');
      }

      const existing = await tx
        .select({ id: pettyCashPeriods.id })
        .from(pettyCashPeriods)
        .where(
          and(
            eq(pettyCashPeriods.pettyCashId, pettyCashId),
            eq(pettyCashPeriods.periodYear, input.periodYear),
            eq(pettyCashPeriods.periodMonth, input.periodMonth),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictException('PERIODO_EXISTENTE: Ya existe un período registrado para este mes y año');
      }

      // El arrastre solo puede provenir del período inmediatamente anterior y cerrado.
      const [previousPeriod] = await tx
        .select()
        .from(pettyCashPeriods)
        .where(
          and(
            eq(pettyCashPeriods.pettyCashId, pettyCashId),
            or(
              sql`${pettyCashPeriods.periodYear} < ${input.periodYear}`,
              and(
                eq(pettyCashPeriods.periodYear, input.periodYear),
                sql`${pettyCashPeriods.periodMonth} < ${input.periodMonth}`,
              ),
            ),
          ),
        )
        .orderBy(desc(pettyCashPeriods.periodYear), desc(pettyCashPeriods.periodMonth))
        .limit(1);

      if (previousPeriod && previousPeriod.status !== PettyCashPeriodStatus.CERRADO) {
        throw new ConflictException(
          'PERIODO_PREVIO_ABIERTO: Debe cerrar el período anterior antes de abrir uno nuevo',
        );
      }

      let openingBal = new Decimal(input.openingBalance);

      if (previousPeriod) {
        openingBal = new Decimal(previousPeriod.closingBalance);
      }

      const [period] = await tx
        .insert(pettyCashPeriods)
        .values({
          pettyCashId,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          openingBalance: openingBal.toFixed(2),
          disbursedTotal: '0.00',
          renderedTotal: '0.00',
          closingBalance: openingBal.toFixed(2),
          status: PettyCashPeriodStatus.ABIERTO,
          openedByUserId: userId,
        })
        .returning();

      await tx.insert(pettyCashMovements).values({
        pettyCashPeriodId: period.id,
        movementType: PettyCashMovementType.APERTURA_ARRASTRE,
        amount: openingBal.toFixed(2),
        previousBalance: '0.00',
        newBalance: openingBal.toFixed(2),
        performedByUserId: userId,
        notes: `Apertura mensual del período ${input.periodYear}-${input.periodMonth}`,
      });

      return period;
    });
  }

  async requestVoucher(periodId: string, input: RequestPettyCashVoucherInput, requestedBy: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [period] = await tx
        .select()
        .from(pettyCashPeriods)
        .where(eq(pettyCashPeriods.id, periodId))
        .limit(1)
        .for('update');

      if (!period) {
        throw new NotFoundException('PERIODO_NO_ENCONTRADO: El período de caja chica no existe');
      }

      if (period.status !== PettyCashPeriodStatus.ABIERTO) {
        throw new ConflictException(
          'PERIODO_CERRADO: No se pueden emitir vales sobre un período cerrado',
        );
      }

      const [projectLink] = await tx
        .select({ projectId: pettyCashProjects.projectId })
        .from(pettyCashProjects)
        .where(
          and(
            eq(pettyCashProjects.pettyCashId, period.pettyCashId),
            eq(pettyCashProjects.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!projectLink) {
        throw new ConflictException(
          'PROYECTO_NO_ASOCIADO: El proyecto no está asociado a la caja chica de este período',
        );
      }

      const year = period.periodYear;
      const sequenceResult = await tx.execute(
        sql`SELECT next_voucher_number(${year}) AS next_number`,
      );
      const nextNumber = Number((sequenceResult as any)[0]?.next_number ?? 0);

      if (!Number.isFinite(nextNumber) || nextNumber <= 0) {
        throw new ConflictException('SECUENCIA_VALE_INVALIDA: No se pudo reservar el número de vale');
      }

      const voucherNumber = `VAL-${year}-${nextNumber.toString().padStart(4, '0')}`;

      const [voucher] = await tx
        .insert(pettyCashVouchers)
        .values({
          voucherNumber,
          pettyCashPeriodId: periodId,
          projectId: input.projectId,
          requestedAmount: new Decimal(input.requestedAmount).toFixed(2),
          purpose: input.purpose,
          status: PettyCashVoucherStatus.SOLICITADO,
          requestedBy,
        })
        .returning();

      return voucher;
    });
  }

  async approveVoucher(voucherId: string, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [voucher] = await tx
        .select()
        .from(pettyCashVouchers)
        .where(eq(pettyCashVouchers.id, voucherId))
        .limit(1)
        .for('update');

      if (!voucher || voucher.status !== PettyCashVoucherStatus.SOLICITADO) {
        throw new ConflictException('ESTADO_INVALIDO: Solo se pueden aprobar vales en estado SOLICITADO');
      }

      const [approved] = await tx
        .update(pettyCashVouchers)
        .set({
          status: PettyCashVoucherStatus.APROBADO,
          approvedByUserId: userId,
        })
        .where(eq(pettyCashVouchers.id, voucherId))
        .returning();

      return approved;
    });
  }

  async disburseVoucher(voucherId: string, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [voucherSnapshot] = await tx
        .select()
        .from(pettyCashVouchers)
        .where(eq(pettyCashVouchers.id, voucherId))
        .limit(1);

      if (!voucherSnapshot) {
        throw new NotFoundException('VALE_NO_ENCONTRADO: El vale de caja chica no existe');
      }

      // Orden de bloqueo consistente: primero período, luego vale.
      const [period] = await tx
        .select()
        .from(pettyCashPeriods)
        .where(eq(pettyCashPeriods.id, voucherSnapshot.pettyCashPeriodId))
        .limit(1)
        .for('update');

      if (!period || period.status !== PettyCashPeriodStatus.ABIERTO) {
        throw new ConflictException(
          'PERIODO_CERRADO: No se pueden desembolsar vales sobre un período cerrado',
        );
      }

      const [voucher] = await tx
        .select()
        .from(pettyCashVouchers)
        .where(eq(pettyCashVouchers.id, voucherId))
        .limit(1)
        .for('update');

      if (!voucher || voucher.status !== PettyCashVoucherStatus.APROBADO) {
        throw new ConflictException('ESTADO_INVALIDO: Solo se pueden desembolsar vales en estado APROBADO');
      }

      const canDisburse = PettyCashLedgerEngine.canDisburse(
        period.closingBalance,
        voucher.requestedAmount,
      );

      if (!canDisburse) {
        throw new ConflictException(
          'FONDOS_INSUFICIENTES: El saldo de la caja chica es insuficiente para este desembolso',
        );
      }

      const newBal = PettyCashLedgerEngine.calculateBalanceAfterDisbursement(
        period.closingBalance,
        voucher.requestedAmount,
      );

      const [disbursed] = await tx
        .update(pettyCashVouchers)
        .set({
          status: PettyCashVoucherStatus.DESEMBOLSADO,
          disbursedByUserId: userId,
        })
        .where(eq(pettyCashVouchers.id, voucherId))
        .returning();

      const newDisbursedTotal = new Decimal(period.disbursedTotal)
        .plus(voucher.requestedAmount)
        .toFixed(2);

      await tx
        .update(pettyCashPeriods)
        .set({
          closingBalance: newBal,
          disbursedTotal: newDisbursedTotal,
        })
        .where(eq(pettyCashPeriods.id, period.id));

      await tx.insert(pettyCashMovements).values({
        pettyCashPeriodId: period.id,
        voucherId: voucher.id,
        movementType: PettyCashMovementType.DESEMBOLSO_VALE,
        amount: voucher.requestedAmount,
        previousBalance: period.closingBalance,
        newBalance: newBal,
        performedByUserId: userId,
        notes: `Desembolso de vale ${voucher.voucherNumber}`,
      });

      return disbursed;
    });
  }

  async renderVoucher(voucherId: string, input: RenderPettyCashVoucherInput, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [voucherSnapshot] = await tx
        .select()
        .from(pettyCashVouchers)
        .where(eq(pettyCashVouchers.id, voucherId))
        .limit(1);

      if (!voucherSnapshot) {
        throw new NotFoundException('VALE_NO_ENCONTRADO: El vale de caja chica no existe');
      }

      // Orden de bloqueo consistente: primero período, luego vale.
      const [period] = await tx
        .select()
        .from(pettyCashPeriods)
        .where(eq(pettyCashPeriods.id, voucherSnapshot.pettyCashPeriodId))
        .limit(1)
        .for('update');

      if (!period || period.status !== PettyCashPeriodStatus.ABIERTO) {
        throw new ConflictException(
          'PERIODO_CERRADO: No se pueden rendir vales sobre un período cerrado',
        );
      }

      const [voucher] = await tx
        .select()
        .from(pettyCashVouchers)
        .where(eq(pettyCashVouchers.id, voucherId))
        .limit(1)
        .for('update');

      if (!voucher || voucher.status !== PettyCashVoucherStatus.DESEMBOLSADO) {
        throw new ConflictException('ESTADO_INVALIDO: Solo se pueden rendir vales que hayan sido desembolsados');
      }

      const isBalanced = PettyCashLedgerEngine.isReconciliationBalanced({
        requestedAmount: voucher.requestedAmount,
        renderedAmount: input.renderedAmount,
        changeAmount: input.changeAmount,
      });

      if (!isBalanced) {
        throw new ConflictException(
          'RENDICION_DESCUADRADA: La suma del monto rendido y el vuelto debe coincidir exactamente con el monto desembolsado',
        );
      }

      const changeReturned = new Decimal(input.changeAmount);
      let currentBalance = new Decimal(period.closingBalance);

      if (changeReturned.greaterThan(0)) {
        currentBalance = currentBalance.plus(changeReturned);
      }

      const [rendered] = await tx
        .update(pettyCashVouchers)
        .set({
          renderedAmount: new Decimal(input.renderedAmount).toFixed(2),
          changeAmount: changeReturned.toFixed(2),
          invoiceReference: input.invoiceReference,
          status: PettyCashVoucherStatus.RENDIDO,
        })
        .where(eq(pettyCashVouchers.id, voucherId))
        .returning();

      const newRenderedTotal = new Decimal(period.renderedTotal)
        .plus(input.renderedAmount)
        .toFixed(2);

      await tx
        .update(pettyCashPeriods)
        .set({
          closingBalance: currentBalance.toFixed(2),
          renderedTotal: newRenderedTotal,
        })
        .where(eq(pettyCashPeriods.id, period.id));

      if (changeReturned.greaterThan(0)) {
        await tx.insert(pettyCashMovements).values({
          pettyCashPeriodId: period.id,
          voucherId: voucher.id,
          movementType: PettyCashMovementType.DEVOLUCION_CAMBIO,
          amount: changeReturned.toFixed(2),
          previousBalance: period.closingBalance,
          newBalance: currentBalance.toFixed(2),
          performedByUserId: userId,
          notes: `Devolución de vuelto de vale ${voucher.voucherNumber} (Factura: ${input.invoiceReference})`,
        });
      }

      return rendered;
    });
  }

  async closePeriod(periodId: string, userId: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [period] = await tx
        .select()
        .from(pettyCashPeriods)
        .where(eq(pettyCashPeriods.id, periodId))
        .limit(1)
        .for('update');

      if (!period || period.status !== PettyCashPeriodStatus.ABIERTO) {
        throw new ConflictException('PERIODO_INVALIDO: El período ya está cerrado o no existe');
      }

      const pendingVouchers = await tx
        .select({
          voucherNumber: pettyCashVouchers.voucherNumber,
          status: pettyCashVouchers.status,
        })
        .from(pettyCashVouchers)
        .where(
          and(
            eq(pettyCashVouchers.pettyCashPeriodId, periodId),
            inArray(pettyCashVouchers.status, PENDING_VOUCHER_STATUSES),
          ),
        );

      if (pendingVouchers.length > 0) {
        const list = pendingVouchers.map((voucher) => voucher.voucherNumber).join(', ');
        throw new ConflictException(
          `VALES_PENDIENTES: No se puede cerrar el período. Existen ${pendingVouchers.length} vale(s) pendientes: ${list}`,
        );
      }

      const [closed] = await tx
        .update(pettyCashPeriods)
        .set({
          status: PettyCashPeriodStatus.CERRADO,
          closedByUserId: userId,
        })
        .where(eq(pettyCashPeriods.id, periodId))
        .returning();

      return closed;
    });
  }
}
