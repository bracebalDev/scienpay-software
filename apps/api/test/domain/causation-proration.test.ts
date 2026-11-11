import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CausationCalculator,
  CausationInput,
} from '../../src/domain/causation/causation-calculator.js';
import { Decimal } from 'decimal.js';

describe('Reglas de Negocio: Motor de Causación y Prorrateo (Especificación de Referencia)', () => {
  describe('Causación de Período Completo', () => {
    it('debe causar exactamente el monto del período completo cuando la asignación abarca todo el corte', () => {
      // Período mensual de Octubre (31 días: del 2026-10-01 al 2026-10-31)
      const input: CausationInput = {
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-10-31',
        assignmentStartDate: '2026-01-01',
        assignmentEndDate: '2026-12-31',
        amountPerPeriod: '850.00',
      };

      const result = CausationCalculator.calculateProration(input);

      assert.equal(result.totalDaysInPeriod, 31, 'Octubre tiene 31 días inclusivos');
      assert.equal(result.activeDays, 31, 'Días activos deben ser 31');
      assert.equal(
        result.calculatedAmount,
        '850.00',
        'Período completo debe ser exactamente igual al monto base',
      );
    });

    it('debe causar el monto completo en quincena de 15 días', () => {
      // 1ra quincena de Octubre: 2026-10-01 al 2026-10-15 (15 días inclusivos)
      const input: CausationInput = {
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-10-15',
        assignmentStartDate: '2026-02-01',
        assignmentEndDate: null,
        amountPerPeriod: '420.00',
      };

      const result = CausationCalculator.calculateProration(input);
      assert.equal(result.totalDaysInPeriod, 15);
      assert.equal(result.activeDays, 15);
      assert.equal(result.calculatedAmount, '420.00');
    });

    it('debe causar el monto completo en quincena de 16 días (segunda quincena de mes de 31 días)', () => {
      // 2da quincena de Octubre: 2026-10-16 al 2026-10-31 (16 días inclusivos)
      const input: CausationInput = {
        periodStartDate: '2026-10-16',
        periodEndDate: '2026-10-31',
        assignmentStartDate: '2026-01-01',
        assignmentEndDate: '2026-12-31',
        amountPerPeriod: '500.00',
      };

      const result = CausationCalculator.calculateProration(input);
      assert.equal(result.totalDaysInPeriod, 16);
      assert.equal(result.activeDays, 16);
      assert.equal(result.calculatedAmount, '500.00');
    });
  });

  describe('Causación Parcial y Política de Redondeo HALF_UP a 2 decimales', () => {
    it('debe prorratear proporcionalmente y redondear con HALF_UP ante fracción .XX5', () => {
      // Supongamos período de 30 días, activos 15 días (factor 0.5):
      // Monto $ 100.00 -> 50.00
      const input: CausationInput = {
        periodStartDate: '2026-06-01',
        periodEndDate: '2026-06-30', // 30 días
        assignmentStartDate: '2026-06-16',
        assignmentEndDate: '2026-06-30', // 15 días activos (16 al 30)
        amountPerPeriod: '100.00',
      };

      const result = CausationCalculator.calculateProration(input);
      assert.equal(result.totalDaysInPeriod, 30);
      assert.equal(result.activeDays, 15);
      assert.equal(result.calculatedAmount, '50.00');
    });

    it('debe redondear hacia arriba (.005 -> .01) cumpliendo la regla HALF_UP', () => {
      // Monto: 100.00 en período de 30 días.
      // Días activos: 7 días.
      // 100 * 7 / 30 = 23.333333... -> 23.33
      const input1: CausationInput = {
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-30', // 30 días
        assignmentStartDate: '2026-04-01',
        assignmentEndDate: '2026-04-07', // 7 días
        amountPerPeriod: '100.00',
      };
      const result1 = CausationCalculator.calculateProration(input1);
      assert.equal(result1.calculatedAmount, '23.33');

      // Caso exacto de mitad: 10.125 -> con HALF_UP debe ser 10.13
      // Monto = 81.00 en 8 días, activo 1 día: 81 / 8 = 10.125 -> 10.13
      const input2: CausationInput = {
        periodStartDate: '2026-01-01',
        periodEndDate: '2026-01-08', // 8 días
        assignmentStartDate: '2026-01-01',
        assignmentEndDate: '2026-01-01', // 1 día
        amountPerPeriod: '81.00',
      };
      const result2 = CausationCalculator.calculateProration(input2);
      assert.equal(
        result2.calculatedAmount,
        '10.13',
        '81 / 8 = 10.125 debe redondearse a 10.13 con HALF_UP',
      );
    });

    it('debe retornar 0.00 si la asignación no intersecta el período de corte', () => {
      const input: CausationInput = {
        periodStartDate: '2026-10-01',
        periodEndDate: '2026-10-31',
        assignmentStartDate: '2026-11-01',
        assignmentEndDate: '2026-11-30',
        amountPerPeriod: '1000.00',
      };

      const result = CausationCalculator.calculateProration(input);
      assert.equal(result.activeDays, 0);
      assert.equal(result.calculatedAmount, '0.00');
    });
  });

  describe('Cambio de Asignación a Mitad de Período', () => {
    it('debe sumar los tramos de dos asignaciones consecutivas en el mismo corte', () => {
      // Mes de Abril (30 días).
      // Tramo 1: del 1 al 10 de Abril con monto período $ 300.00 (10 días -> 300 * 10 / 30 = 100.00)
      // Tramo 2: del 11 al 30 de Abril con monto período $ 600.00 (20 días -> 600 * 20 / 30 = 400.00)
      // Total causado en el mes = $ 500.00
      const tramo1: CausationInput = {
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-30',
        assignmentStartDate: '2026-04-01',
        assignmentEndDate: '2026-04-10',
        amountPerPeriod: '300.00',
      };

      const tramo2: CausationInput = {
        periodStartDate: '2026-04-01',
        periodEndDate: '2026-04-30',
        assignmentStartDate: '2026-04-11',
        assignmentEndDate: '2026-04-30',
        amountPerPeriod: '600.00',
      };

      const res1 = CausationCalculator.calculateProration(tramo1);
      const res2 = CausationCalculator.calculateProration(tramo2);

      assert.equal(res1.calculatedAmount, '100.00');
      assert.equal(res2.calculatedAmount, '400.00');

      const total = new Decimal(res1.calculatedAmount).plus(res2.calculatedAmount).toFixed(2);
      assert.equal(total, '500.00');
    });
  });
});
