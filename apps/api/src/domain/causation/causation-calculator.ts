import { Decimal } from 'decimal.js';

export interface CausationInput {
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string;   // YYYY-MM-DD
  assignmentStartDate: string; // YYYY-MM-DD
  assignmentEndDate?: string | null; // YYYY-MM-DD o null
  amountPerPeriod: string | number; // USD
}

export interface CausationProrationResult {
  totalDaysInPeriod: number;
  activeDays: number;
  baseAmount: string;
  calculatedAmount: string; // Redondeo HALF_UP a 2 decimales
}

/**
 * Motor de Prorrateo de Causación (Función Pura de Dominio).
 * Cumple con la especificación rectora:
 * - Días calendario inclusivos.
 * - Prorrateo exacto: monto_causado = monto_periodo * (dias_activos / dias_del_periodo).
 * - Redondeo estricto HALF_UP a 2 decimales con Decimal.js.
 * - Sin dependencias externas ni I/O.
 */
export class CausationCalculator {
  public static calculateProration(input: CausationInput): CausationProrationResult {
    const periodStart = this.parseDate(input.periodStartDate);
    const periodEnd = this.parseDate(input.periodEndDate);

    if (periodEnd < periodStart) {
      throw new Error('PERIODO_INVALIDO: La fecha de fin del período no puede ser anterior a la de inicio');
    }

    const totalDaysInPeriod = this.diffInDaysInclusive(periodStart, periodEnd);

    const asgStart = this.parseDate(input.assignmentStartDate);
    const asgEnd = input.assignmentEndDate ? this.parseDate(input.assignmentEndDate) : Infinity;

    const effectiveStart = Math.max(periodStart, asgStart);
    const effectiveEnd = Math.min(periodEnd, asgEnd);

    let activeDays = 0;
    if (effectiveStart <= effectiveEnd) {
      activeDays = this.diffInDaysInclusive(effectiveStart, effectiveEnd);
    }

    const baseAmountDec = new Decimal(input.amountPerPeriod);
    const baseAmountStr = baseAmountDec.toFixed(2, Decimal.ROUND_HALF_UP);

    if (activeDays === 0) {
      return {
        totalDaysInPeriod,
        activeDays: 0,
        baseAmount: baseAmountStr,
        calculatedAmount: '0.00',
      };
    }

    if (activeDays === totalDaysInPeriod) {
      return {
        totalDaysInPeriod,
        activeDays,
        baseAmount: baseAmountStr,
        calculatedAmount: baseAmountStr,
      };
    }

    // Fórmula: monto_periodo * dias_activos / dias_totales
    const calculated = baseAmountDec
      .times(activeDays)
      .dividedBy(totalDaysInPeriod)
      .toFixed(2, Decimal.ROUND_HALF_UP);

    return {
      totalDaysInPeriod,
      activeDays,
      baseAmount: baseAmountStr,
      calculatedAmount: calculated,
    };
  }

  private static parseDate(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  private static diffInDaysInclusive(startMs: number, endMs: number): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.round((endMs - startMs) / MS_PER_DAY) + 1;
  }
}
