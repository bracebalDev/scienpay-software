import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIFOAllocationEngine,
  PendingDebtItem,
  PaymentAllocationResult,
} from '../../src/domain/payments/fifo-allocation.engine.js';
import { CausationItemStatus } from '@scienpay/shared';
import { Decimal } from 'decimal.js';

describe('Reglas de Negocio: Amortización de Pagos Parciales por FIFO (ADR-005)', () => {
  it('rechaza terminantemente si el pago aplicado SUPERA la deuda pendiente total', () => {
    const debts: PendingDebtItem[] = [
      {
        id: 'item-01',
        periodStartDate: '2026-01-01',
        calculatedAmount: '100.00',
        paidAmount: '0.00',
        remainingDebt: '100.00',
      },
    ];

    assert.throws(
      () => FIFOAllocationEngine.allocatePayment(debts, '150.00'),
      /PAGO_EXCEDE_DEUDA: El monto a pagar \(\$150.00\) supera la deuda total pendiente \(\$100.00\)/,
    );
  });

  it('aplica amortización FIFO pagando al 100% la cuota más antigua y abonando el remanente a la segunda', () => {
    // Causación 1 (Enero): Deuda $ 420.00
    // Causación 2 (Febrero): Deuda $ 500.00
    // Total deuda = $ 920.00
    // Monto a desembolsar = $ 500.00
    // Resultado esperado:
    // - Causación 1: $ 420.00 abonados (PAGADO_TOTAL, saldo 0.00)
    // - Causación 2: $ 80.00 abonados (PAGADO_PARCIAL, pagado 80.00, saldo 420.00)
    const debts: PendingDebtItem[] = [
      {
        id: 'item-enero',
        periodStartDate: '2026-01-01',
        calculatedAmount: '420.00',
        paidAmount: '0.00',
        remainingDebt: '420.00',
      },
      {
        id: 'item-febrero',
        periodStartDate: '2026-02-01',
        calculatedAmount: '500.00',
        paidAmount: '0.00',
        remainingDebt: '500.00',
      },
    ];

    const result = FIFOAllocationEngine.allocatePayment(debts, '500.00');

    assert.equal(result.totalAllocatedUSD, '500.00');
    assert.equal(result.remainingDebtAfterUSD, '420.00');
    assert.equal(result.allocations.length, 2);

    // Verificación ítem 1 (Enero)
    const alloc1 = result.allocations[0];
    assert.equal(alloc1.causationItemId, 'item-enero');
    assert.equal(alloc1.allocatedAmountUSD, '420.00');
    assert.equal(alloc1.newPaidAmountUSD, '420.00');
    assert.equal(alloc1.newRemainingDebtUSD, '0.00');
    assert.equal(alloc1.newStatus, CausationItemStatus.PAGADO_TOTAL);

    // Verificación ítem 2 (Febrero)
    const alloc2 = result.allocations[1];
    assert.equal(alloc2.causationItemId, 'item-febrero');
    assert.equal(alloc2.allocatedAmountUSD, '80.00');
    assert.equal(alloc2.newPaidAmountUSD, '80.00');
    assert.equal(alloc2.newRemainingDebtUSD, '420.00');
    assert.equal(alloc2.newStatus, CausationItemStatus.PAGADO_PARCIAL);
  });

  it('verifica la regla fundamental: causado - pagado = saldo remanente para cada ítem', () => {
    const debts: PendingDebtItem[] = [
      {
        id: 'item-01',
        periodStartDate: '2026-03-01',
        calculatedAmount: '850.00',
        paidAmount: '200.00', // ya tenía un abono previo
        remainingDebt: '650.00',
      },
    ];

    // Se pagan $ 300.00 adicionales
    const result = FIFOAllocationEngine.allocatePayment(debts, '300.00');
    const alloc = result.allocations[0];

    assert.equal(alloc.allocatedAmountUSD, '300.00');
    assert.equal(alloc.newPaidAmountUSD, '500.00');
    assert.equal(alloc.newRemainingDebtUSD, '350.00');

    // Regla: causado - pagado = saldo
    const causado = new Decimal(debts[0].calculatedAmount);
    const pagado = new Decimal(alloc.newPaidAmountUSD);
    const saldo = new Decimal(alloc.newRemainingDebtUSD);
    assert.ok(causado.minus(pagado).equals(saldo), 'Debe cumplirse: causado - pagado = saldo');
  });

  it('permite pagar exactamente el 100% de la deuda acumulada dejando saldo en 0.00', () => {
    const debts: PendingDebtItem[] = [
      {
        id: 'item-01',
        periodStartDate: '2026-01-01',
        calculatedAmount: '123.45',
        paidAmount: '0.00',
        remainingDebt: '123.45',
      },
    ];

    const result = FIFOAllocationEngine.allocatePayment(debts, '123.45');
    assert.equal(result.totalAllocatedUSD, '123.45');
    assert.equal(result.remainingDebtAfterUSD, '0.00');
    assert.equal(result.allocations[0].newStatus, CausationItemStatus.PAGADO_TOTAL);
  });
});
