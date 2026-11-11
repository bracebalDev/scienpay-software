import { Decimal } from 'decimal.js';
import { CausationItemStatus } from '@scienpay/shared';

export interface PendingDebtItem {
  id: string;
  periodStartDate: string;
  calculatedAmount: string;
  paidAmount: string;
  remainingDebt: string;
}

export interface ItemAllocationDetail {
  causationItemId: string;
  allocatedAmountUSD: string;
  debtBeforeAllocationUSD: string;
  debtAfterAllocationUSD: string;
  newPaidAmountUSD: string;
  newRemainingDebtUSD: string;
  newStatus: CausationItemStatus;
}

export interface PaymentAllocationResult {
  totalAllocatedUSD: string;
  remainingDebtAfterUSD: string;
  allocations: ItemAllocationDetail[];
}

/**
 * Motor de Amortización FIFO para Pagos Parciales (Función Pura de Dominio).
 * Reglas de negocio:
 * 1. Orden cronológico ascendente estricto (la cuota más antigua se amortiza primero).
 * 2. Ningún pago aplicado puede superar la deuda pendiente acumulada.
 * 3. Exactitud matemática: causado - pagado = saldo.
 * 4. Precisión con Decimal.js (sin flotantes binarios).
 */
export class FIFOAllocationEngine {
  public static allocatePayment(
    debts: PendingDebtItem[],
    paymentAmount: string | number,
  ): PaymentAllocationResult {
    let available = new Decimal(paymentAmount);

    if (available.lessThanOrEqualTo(0)) {
      throw new Error('MONTO_INVALIDO: El monto del pago debe ser mayor a 0');
    }

    // Calcular deuda acumulada total
    let totalPendingDebt = new Decimal(0);
    for (const item of debts) {
      totalPendingDebt = totalPendingDebt.plus(new Decimal(item.remainingDebt));
    }

    // REGLA OBLIGATORIA: Ningún pago aplicado supera la deuda pendiente
    if (available.greaterThan(totalPendingDebt)) {
      throw new Error(
        `PAGO_EXCEDE_DEUDA: El monto a pagar ($${available.toFixed(2)}) supera la deuda total pendiente ($${totalPendingDebt.toFixed(2)})`,
      );
    }

    // Ordenar cronológicamente ascendente con desempate determinista por ID.
    const sortedDebts = [...debts].sort((a, b) => {
      const dateDiff =
        new Date(a.periodStartDate).getTime() - new Date(b.periodStartDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    const allocations: ItemAllocationDetail[] = [];
    const initialPayment = new Decimal(paymentAmount);

    for (const item of sortedDebts) {
      if (available.isZero()) {
        break;
      }

      const debtRemaining = new Decimal(item.remainingDebt);
      const currentPaid = new Decimal(item.paidAmount);

      if (debtRemaining.isZero()) {
        continue;
      }

      if (available.greaterThanOrEqualTo(debtRemaining)) {
        // Amortización al 100% de esta cuota
        const allocated = debtRemaining;
        const newPaid = currentPaid.plus(allocated);

        allocations.push({
          causationItemId: item.id,
          allocatedAmountUSD: allocated.toFixed(2),
          debtBeforeAllocationUSD: debtRemaining.toFixed(2),
          debtAfterAllocationUSD: '0.00',
          newPaidAmountUSD: newPaid.toFixed(2),
          newRemainingDebtUSD: '0.00',
          newStatus: CausationItemStatus.PAGADO_TOTAL,
        });

        available = available.minus(allocated);
      } else {
        // Abono parcial
        const allocated = available;
        const newPaid = currentPaid.plus(allocated);
        const newRemaining = debtRemaining.minus(allocated);

        allocations.push({
          causationItemId: item.id,
          allocatedAmountUSD: allocated.toFixed(2),
          debtBeforeAllocationUSD: debtRemaining.toFixed(2),
          debtAfterAllocationUSD: newRemaining.toFixed(2),
          newPaidAmountUSD: newPaid.toFixed(2),
          newRemainingDebtUSD: newRemaining.toFixed(2),
          newStatus: CausationItemStatus.PAGADO_PARCIAL,
        });

        available = new Decimal(0);
      }
    }

    const remainingDebtAfter = totalPendingDebt.minus(initialPayment);

    return {
      totalAllocatedUSD: initialPayment.toFixed(2),
      remainingDebtAfterUSD: remainingDebtAfter.toFixed(2),
      allocations,
    };
  }
}
