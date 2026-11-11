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

  it('debe permitir en causation_items únicamente paid_amount, remaining_debt y status', () => {
    const ddl = FinancialImmutabilityEngine.generateCausationItemsTriggerFunction();

    assert.ok(ddl.includes('enforce_causation_items_immutability'));
    assert.ok(ddl.includes("TG_OP = 'DELETE'"));
    // El trigger usa lista negra: las columnas mutables NO deben aparecer como inmutables.
    assert.ok(!ddl.includes('NEW.paid_amount IS DISTINCT FROM OLD.paid_amount'));
    assert.ok(!ddl.includes('NEW.remaining_debt IS DISTINCT FROM OLD.remaining_debt'));
    assert.ok(!ddl.includes('NEW.status IS DISTINCT FROM OLD.status'));
    assert.ok(ddl.includes('NEW.calculated_amount IS DISTINCT FROM OLD.calculated_amount'));
    assert.ok(ddl.includes('NEW.base_amount IS DISTINCT FROM OLD.base_amount'));
    assert.deepEqual(
      [...FinancialImmutabilityEngine.CAUSATION_ITEM_MUTABLE_COLUMNS],
      ['paid_amount', 'remaining_debt', 'status'],
    );
  });

  it('debe permitir en causation_batches únicamente los campos de anulación', () => {
    const ddl = FinancialImmutabilityEngine.generateCausationBatchesTriggerFunction();

    assert.ok(ddl.includes('enforce_causation_batches_immutability'));
    assert.ok(ddl.includes("TG_OP = 'DELETE'"));
    // El trigger usa lista negra: los campos de anulación NO deben aparecer como inmutables.
    assert.ok(!ddl.includes('NEW.annulment_reason IS DISTINCT FROM OLD.annulment_reason'));
    assert.ok(!ddl.includes('NEW.annulled_by_user_id IS DISTINCT FROM OLD.annulled_by_user_id'));
    assert.ok(!ddl.includes('NEW.annulled_at IS DISTINCT FROM OLD.annulled_at'));
    assert.ok(ddl.includes('NEW.total_causation_amount IS DISTINCT FROM OLD.total_causation_amount'));
    assert.deepEqual(
      [...FinancialImmutabilityEngine.CAUSATION_BATCH_MUTABLE_COLUMNS],
      ['status', 'annulment_reason', 'annulled_by_user_id', 'annulled_at'],
    );
  });

  it('debe generar sentencias de trigger BEFORE UPDATE OR DELETE para cada tabla inmutable', () => {
    const statements = FinancialImmutabilityEngine.generateAllTableTriggers();
    const tables = FinancialImmutabilityEngine.getImmutableTables();

    for (const table of tables) {
      const expectedFunction =
        table === 'causation_items'
          ? 'enforce_causation_items_immutability()'
          : table === 'causation_batches'
            ? 'enforce_causation_batches_immutability()'
            : 'enforce_financial_immutability()';

      const hasTrigger = statements.some(
        (sql) => sql.includes(`BEFORE UPDATE OR DELETE ON ${table}`) && sql.includes(expectedFunction),
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

  it('debe generar la tabla contador transaccional y la función next_receipt_number', () => {
    const tableDdl = FinancialImmutabilityEngine.generateReceiptSequenceTableDDL();
    const functionDdl = FinancialImmutabilityEngine.generateNextReceiptNumberFunctionDDL();

    assert.ok(tableDdl.includes('CREATE TABLE IF NOT EXISTS receipt_sequences'));
    assert.ok(tableDdl.includes('year INTEGER PRIMARY KEY'));
    assert.ok(tableDdl.includes('last_number BIGINT'));

    assert.ok(functionDdl.includes('CREATE OR REPLACE FUNCTION next_receipt_number(p_year INTEGER)'));
    assert.ok(functionDdl.includes('ON CONFLICT (year) DO UPDATE'));
    assert.ok(functionDdl.includes('receipt_sequences.last_number + 1'));
    assert.ok(functionDdl.includes('RETURNING last_number INTO v_next'));
  });

  it('debe formatear números de recibo correlativos con el prefijo oficial REC-YYYY-000000', () => {
    const formatted = FinancialImmutabilityEngine.formatReceiptNumber(2026, 42);
    assert.equal(formatted, 'REC-2026-000042');

    const formattedBig = FinancialImmutabilityEngine.formatReceiptNumber(2026, 123456);
    assert.equal(formattedBig, 'REC-2026-123456');
  });
});
