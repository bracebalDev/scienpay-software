import { Decimal } from 'decimal.js';

export interface VoucherReconciliationInput {
  requestedAmount: string | number;
  renderedAmount: string | number;
  changeAmount: string | number;
}

/**
 * Motor de Cuadratura y Movimientos de Caja Chica (Función Pura de Dominio).
 * Garantiza la cuadratura contable estricta:
 * - Sin saldo negativo en caja.
 * - Rendición de vales con comprobante exacto: rendido + vuelto = desembolsado.
 * - Arrastre inmutable de saldos de cierre al mes siguiente.
 */
export class PettyCashLedgerEngine {
  public static canDisburse(
    currentBalance: string | number,
    requestedAmount: string | number,
  ): boolean {
    const bal = new Decimal(currentBalance);
    const req = new Decimal(requestedAmount);
    return req.greaterThan(0) && bal.greaterThanOrEqualTo(req);
  }

  public static calculateBalanceAfterDisbursement(
    currentBalance: string | number,
    disbursedAmount: string | number,
  ): string {
    const bal = new Decimal(currentBalance);
    const dis = new Decimal(disbursedAmount);

    if (dis.greaterThan(bal)) {
      throw new Error(
        'FONDOS_INSUFICIENTES: El monto a desembolsar excede el saldo de caja disponible',
      );
    }

    return bal.minus(dis).toFixed(2);
  }

  public static isReconciliationBalanced(input: VoucherReconciliationInput): boolean {
    const req = new Decimal(input.requestedAmount);
    const ren = new Decimal(input.renderedAmount);
    const chg = new Decimal(input.changeAmount);

    return ren.plus(chg).equals(req);
  }

  public static calculateBalanceAfterChangeReturn(
    currentBalance: string | number,
    changeAmount: string | number,
  ): string {
    const bal = new Decimal(currentBalance);
    const chg = new Decimal(changeAmount);

    return bal.plus(chg).toFixed(2);
  }

  public static calculateCarryOverBalance(
    openingBalance: string | number,
    totalDisbursed: string | number,
    totalChangeReturned: string | number,
  ): string {
    const open = new Decimal(openingBalance);
    const dis = new Decimal(totalDisbursed);
    const chg = new Decimal(totalChangeReturned);

    return open.minus(dis).plus(chg).toFixed(2);
  }
}
