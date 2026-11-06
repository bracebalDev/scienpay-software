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
import { eq, and, desc } from 'drizzle-orm';
import { Decimal } from 'decimal.js';

@Injectable()
export class PettyCashService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listPettyCashes() {
    return this.databaseService.db.select().from(pettyCash).orderBy(pettyCash.name);
  }

  async createPettyCash(input: CreatePettyCashInput) {
    const [created] = await this.databaseService.db
      .insert(pettyCash)
      .values({
        name: input.name,
        description: input.description || '',
        custodianName: input.custodianName,
        status: PettyCashStatus.ACTIVA,
      })
      .returning();

    for (const projectId of input.projectIds) {
      await this.databaseService.db.insert(pettyCashProjects).values({
        pettyCashId: created.id,
        projectId,
      });
    }

    return created;
  }

  async openPeriod(pettyCashId: string, input: OpenPettyCashPeriodInput, userId: string) {
    // 1. Verificar si ya existe período abierto para ese año y mes
    const existing = await this.databaseService.db
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

    // 2. Comprobar si existe un mes anterior cerrado para arrastre de saldo automático
    let openingBal = new Decimal(input.openingBalance);
    const [previousPeriod] = await this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.pettyCashId, pettyCashId))
      .orderBy(desc(pettyCashPeriods.periodYear), desc(pettyCashPeriods.periodMonth))
      .limit(1);

    if (previousPeriod && previousPeriod.status === PettyCashPeriodStatus.CERRADO) {
      openingBal = new Decimal(previousPeriod.closingBalance);
    }

    const [period] = await this.databaseService.db
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

    // Registrar movimiento inmutable de apertura
    await this.databaseService.db.insert(pettyCashMovements).values({
      pettyCashPeriodId: period.id,
      movementType: PettyCashMovementType.APERTURA_ARRASTRE,
      amount: openingBal.toFixed(2),
      previousBalance: '0.00',
      newBalance: openingBal.toFixed(2),
      performedByUserId: userId,
      notes: `Apertura mensual del período ${input.periodYear}-${input.periodMonth}`,
    });

    return period;
  }

  async requestVoucher(periodId: string, input: RequestPettyCashVoucherInput, requestedBy: string) {
    const [period] = await this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.id, periodId))
      .limit(1);

    if (!period || period.status !== PettyCashPeriodStatus.ABIERTO) {
      throw new ConflictException('PERIODO_CERRADO: No se pueden emitir vales sobre un período cerrado o inexistente');
    }

    const year = period.periodYear;
    const countVouchers = await this.databaseService.db
      .select({ id: pettyCashVouchers.id })
      .from(pettyCashVouchers)
      .where(eq(pettyCashVouchers.pettyCashPeriodId, periodId));
    const nextSeq = (countVouchers.length + 1).toString().padStart(4, '0');
    const voucherNumber = `VAL-${year}-${nextSeq}`;

    const [voucher] = await this.databaseService.db
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
  }

  async approveVoucher(voucherId: string, userId: string) {
    const [voucher] = await this.databaseService.db
      .select()
      .from(pettyCashVouchers)
      .where(eq(pettyCashVouchers.id, voucherId))
      .limit(1);

    if (!voucher || voucher.status !== PettyCashVoucherStatus.SOLICITADO) {
      throw new ConflictException('ESTADO_INVALIDO: Solo se pueden aprobar vales en estado SOLICITADO');
    }

    const [approved] = await this.databaseService.db
      .update(pettyCashVouchers)
      .set({
        status: PettyCashVoucherStatus.APROBADO,
        approvedByUserId: userId,
      })
      .where(eq(pettyCashVouchers.id, voucherId))
      .returning();

    return approved;
  }

  async disburseVoucher(voucherId: string, userId: string) {
    const [voucher] = await this.databaseService.db
      .select()
      .from(pettyCashVouchers)
      .where(eq(pettyCashVouchers.id, voucherId))
      .limit(1);

    if (!voucher || voucher.status !== PettyCashVoucherStatus.APROBADO) {
      throw new ConflictException('ESTADO_INVALIDO: Solo se pueden desembolsar vales en estado APROBADO');
    }

    const [period] = await this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.id, voucher.pettyCashPeriodId))
      .limit(1);

    const canDisburse = PettyCashLedgerEngine.canDisburse(period.closingBalance, voucher.requestedAmount);
    if (!canDisburse) {
      throw new ConflictException('FONDOS_INSUFICIENTES: El saldo de la caja chica es insuficiente para este desembolso');
    }

    const newBal = PettyCashLedgerEngine.calculateBalanceAfterDisbursement(
      period.closingBalance,
      voucher.requestedAmount,
    );

    const [disbursed] = await this.databaseService.db
      .update(pettyCashVouchers)
      .set({
        status: PettyCashVoucherStatus.DESEMBOLSADO,
        disbursedByUserId: userId,
      })
      .where(eq(pettyCashVouchers.id, voucherId))
      .returning();

    const newDisbursedTotal = new Decimal(period.disbursedTotal).plus(voucher.requestedAmount).toFixed(2);
    await this.databaseService.db
      .update(pettyCashPeriods)
      .set({
        closingBalance: newBal,
        disbursedTotal: newDisbursedTotal,
      })
      .where(eq(pettyCashPeriods.id, period.id));

    // Registrar movimiento inmutable de desembolso
    await this.databaseService.db.insert(pettyCashMovements).values({
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
  }

  async renderVoucher(voucherId: string, input: RenderPettyCashVoucherInput, userId: string) {
    const [voucher] = await this.databaseService.db
      .select()
      .from(pettyCashVouchers)
      .where(eq(pettyCashVouchers.id, voucherId))
      .limit(1);

    if (!voucher || voucher.status !== PettyCashVoucherStatus.DESEMBOLSADO) {
      throw new ConflictException('ESTADO_INVALIDO: Solo se pueden rendir vales que hayan sido desembolsados');
    }

    // Validar cuadratura exacta
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

    const [period] = await this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.id, voucher.pettyCashPeriodId))
      .limit(1);

    const changeReturned = new Decimal(input.changeAmount);
    let currentBalance = new Decimal(period.closingBalance);

    if (changeReturned.greaterThan(0)) {
      currentBalance = currentBalance.plus(changeReturned);
    }

    const [rendered] = await this.databaseService.db
      .update(pettyCashVouchers)
      .set({
        renderedAmount: new Decimal(input.renderedAmount).toFixed(2),
        changeAmount: changeReturned.toFixed(2),
        invoiceReference: input.invoiceReference,
        status: PettyCashVoucherStatus.RENDIDO,
      })
      .where(eq(pettyCashVouchers.id, voucherId))
      .returning();

    const newRenderedTotal = new Decimal(period.renderedTotal).plus(input.renderedAmount).toFixed(2);
    await this.databaseService.db
      .update(pettyCashPeriods)
      .set({
        closingBalance: currentBalance.toFixed(2),
        renderedTotal: newRenderedTotal,
      })
      .where(eq(pettyCashPeriods.id, period.id));

    // Si hubo vuelto, registrar movimiento inmutable
    if (changeReturned.greaterThan(0)) {
      await this.databaseService.db.insert(pettyCashMovements).values({
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
  }

  async closePeriod(periodId: string, userId: string) {
    const [period] = await this.databaseService.db
      .select()
      .from(pettyCashPeriods)
      .where(eq(pettyCashPeriods.id, periodId))
      .limit(1);

    if (!period || period.status !== PettyCashPeriodStatus.ABIERTO) {
      throw new ConflictException('PERIODO_INVALIDO: El período ya está cerrado o no existe');
    }

    const [closed] = await this.databaseService.db
      .update(pettyCashPeriods)
      .set({
        status: PettyCashPeriodStatus.CERRADO,
        closedByUserId: userId,
      })
      .where(eq(pettyCashPeriods.id, periodId))
      .returning();

    return closed;
  }
}
