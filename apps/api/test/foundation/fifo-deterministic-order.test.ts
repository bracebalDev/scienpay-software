import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FIFOAllocationEngine } from '../../src/domain/payments/fifo-allocation.engine.js';

describe('FIFO determinista y validación de desembolsos (Fase 2.4/2.5)', () => {
  it('debe desempatar por ID cuando dos deudas tienen la misma fecha', () => {
    const result = FIFOAllocationEngine.allocatePayment(
      [
        {
          id: 'bbbb',
          periodStartDate: '2026-01-01',
          calculatedAmount: '100.00',
          paidAmount: '0.00',
          remainingDebt: '100.00',
        },
        {
          id: 'aaaa',
          periodStartDate: '2026-01-01',
          calculatedAmount: '100.00',
          paidAmount: '0.00',
          remainingDebt: '100.00',
        },
      ],
      '100.00',
    );

    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].causationItemId, 'aaaa');
  });

  it('debe rechazar un pago que excede la deuda pendiente', () => {
    assert.throws(
      () =>
        FIFOAllocationEngine.allocatePayment(
          [
            {
              id: 'item-1',
              periodStartDate: '2026-01-01',
              calculatedAmount: '100.00',
              paidAmount: '0.00',
              remainingDebt: '100.00',
            },
          ],
          '100.01',
        ),
      /PAGO_EXCEDE_DEUDA/,
    );
  });

  it('debe rechazar un pago sobre una persona sin causaciones pendientes', () => {
    assert.throws(
      () => FIFOAllocationEngine.allocatePayment([], '10.00'),
      /PAGO_EXCEDE_DEUDA/,
    );
  });

  it('debe amortizar la deuda más antigua primero y dejar saldo exacto', () => {
    const result = FIFOAllocationEngine.allocatePayment(
      [
        {
          id: 'item-nuevo',
          periodStartDate: '2026-02-01',
          calculatedAmount: '50.00',
          paidAmount: '0.00',
          remainingDebt: '50.00',
        },
        {
          id: 'item-viejo',
          periodStartDate: '2026-01-01',
          calculatedAmount: '80.00',
          paidAmount: '0.00',
          remainingDebt: '80.00',
        },
      ],
      '100.00',
    );

    assert.equal(result.allocations[0].causationItemId, 'item-viejo');
    assert.equal(result.allocations[0].newRemainingDebtUSD, '0.00');
    assert.equal(result.allocations[1].causationItemId, 'item-nuevo');
    assert.equal(result.allocations[1].allocatedAmountUSD, '20.00');
    assert.equal(result.remainingDebtAfterUSD, '30.00');
  });
});
