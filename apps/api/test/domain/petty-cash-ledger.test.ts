import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PettyCashLedgerEngine,
  VoucherReconciliationInput,
} from '../../src/domain/petty-cash/petty-cash-ledger.engine.js';
import { PettyCashVoucherStatus } from '@scienpay/shared';

describe('Reglas de Negocio: Gestión y Cuadratura de Cajas Chicas', () => {
  it('valida que el desembolso de un vale no puede exceder el saldo disponible de la caja', () => {
    const currentBalance = '100.00';
    const requestedVoucher = '150.00';

    assert.equal(
      PettyCashLedgerEngine.canDisburse(currentBalance, requestedVoucher),
      false,
      'No se puede desembolsar un monto mayor al saldo existente en caja',
    );
  });

  it('calcula el nuevo saldo tras el desembolso de un vale aprobado', () => {
    const currentBalance = '500.00';
    const voucherAmount = '120.50';

    const newBalance = PettyCashLedgerEngine.calculateBalanceAfterDisbursement(
      currentBalance,
      voucherAmount,
    );

    assert.equal(newBalance, '379.50');
  });

  it('valida que la rendición cuadre exactamente: monto_rendido + vuelto = monto_solicitado', () => {
    const validReconciliation: VoucherReconciliationInput = {
      requestedAmount: '100.00',
      renderedAmount: '85.25',
      changeAmount: '14.75', // 85.25 + 14.75 = 100.00
    };

    assert.equal(
      PettyCashLedgerEngine.isReconciliationBalanced(validReconciliation),
      true,
    );

    const invalidReconciliation: VoucherReconciliationInput = {
      requestedAmount: '100.00',
      renderedAmount: '80.00',
      changeAmount: '10.00', // 90 != 100
    };

    assert.equal(
      PettyCashLedgerEngine.isReconciliationBalanced(invalidReconciliation),
      false,
    );
  });

  it('calcula el nuevo saldo tras la rendición con devolución de cambio', () => {
    const currentBalance = '379.50';
    const changeReturned = '14.75';

    const newBalance = PettyCashLedgerEngine.calculateBalanceAfterChangeReturn(
      currentBalance,
      changeReturned,
    );

    assert.equal(newBalance, '394.25');
  });

  it('calcula el arrastre de saldo mensual para la apertura del mes siguiente', () => {
    const openingBalance = '1000.00';
    const totalDisbursed = '400.00';
    const totalChangeReturned = '50.00';

    const nextOpening = PettyCashLedgerEngine.calculateCarryOverBalance(
      openingBalance,
      totalDisbursed,
      totalChangeReturned,
    );

    assert.equal(nextOpening, '650.00', '1000 - 400 + 50 = 650.00 de saldo que se arrastra');
  });
});
