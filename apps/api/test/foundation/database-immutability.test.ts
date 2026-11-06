import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialImmutabilityEngine } from '../../src/domain/financial/financial-immutability.engine.js';

describe('Inmutabilidad Financiera y Secuencias Consecutivas (ADR-003 & Especificación)', () => {
  it('debe definir la lista completa de tablas financieras que requieren inmutabilidad estricta', () => {
    const immutableTables = FinancialImmutabilityEngine.getImmutableTables();
    const expected = [
      'causation_batches',
      'causation_items',
      'payment_requests',
      'disbursements',
      'receipts',
      'receipt_allocations',
      'petty_cash_movements',
      'audit_log',
    ];

    for (const table of expected) {
      assert.ok(
        immutableTables.includes(table),
        `La tabla ${table} debe estar clasificada como inmutable`,
      );
    }
  });

  it('debe generar la función trigger PL/pgSQL que bloquea UPDATE y DELETE con excepción fatal', () => {
    const ddl = FinancialImmutabilityEngine.generateImmutabilityTriggerFunction();
    assert.ok(ddl.includes('CREATE OR REPLACE FUNCTION enforce_financial_immutability()'));
    assert.ok(ddl.includes('RAISE EXCEPTION'));
    assert.ok(ddl.includes('VIOLACION_DE_INTEGRIDAD_FINANCIERA'));
  });

  it('debe generar sentencias de trigger BEFORE UPDATE OR DELETE para cada tabla inmutable', () => {
    const statements = FinancialImmutabilityEngine.generateAllTableTriggers();
    const tables = FinancialImmutabilityEngine.getImmutableTables();

    for (const table of tables) {
      const hasTrigger = statements.some(
        (sql) => sql.includes(`BEFORE UPDATE OR DELETE ON ${table}`) && sql.includes('enforce_financial_immutability()'),
      );
      assert.ok(hasTrigger, `Debe existir un trigger BEFORE UPDATE OR DELETE para la tabla ${table}`);
    }
  });

  it('debe generar la definición DDL de la secuencia dedicada sin saltos para recibos', () => {
    const seqDdl = FinancialImmutabilityEngine.generateReceiptSequenceDDL();
    assert.ok(seqDdl.includes('CREATE SEQUENCE IF NOT EXISTS receipt_number_seq'));
    assert.ok(seqDdl.includes('START WITH 1'));
    assert.ok(seqDdl.includes('INCREMENT BY 1'));
  });

  it('debe formatear números de recibo correlativos con el prefijo oficial REC-YYYY-000000', () => {
    const formatted = FinancialImmutabilityEngine.formatReceiptNumber(2026, 42);
    assert.equal(formatted, 'REC-2026-000042');

    const formattedBig = FinancialImmutabilityEngine.formatReceiptNumber(2026, 123456);
    assert.equal(formattedBig, 'REC-2026-123456');
  });
});
