import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  process.cwd(),
  'src',
  'infrastructure',
  'database',
  'migrations',
  '0003_petty_cash_voucher_sequences.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');

describe('Migración 0003: secuencia de vales e idempotencia (Fase 2.1)', () => {
  it('debe crear la tabla voucher_sequences y la función next_voucher_number', () => {
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS voucher_sequences'));
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION next_voucher_number'));
    assert.ok(sql.includes('ON CONFLICT (year) DO UPDATE'));
    assert.ok(sql.includes('RETURNING last_number INTO v_next'));
  });

  it('debe sembrar la secuencia desde los vales existentes', () => {
    assert.ok(sql.includes('FROM petty_cash_vouchers'));
    assert.ok(sql.includes("voucher_number ~ '^VAL-[0-9]{4}-[0-9]+$'"));
    assert.ok(sql.includes('GREATEST(voucher_sequences.last_number, EXCLUDED.last_number)'));
  });

  it('debe sustituir la restricción de idempotencia por un índice parcial', () => {
    assert.ok(sql.includes('DROP CONSTRAINT IF EXISTS uq_causation_batch_idempotence'));
    assert.ok(sql.includes('uq_causation_batch_idempotence_active'));
    assert.ok(sql.includes("WHERE status <> 'ANULADO'"));
  });
});
