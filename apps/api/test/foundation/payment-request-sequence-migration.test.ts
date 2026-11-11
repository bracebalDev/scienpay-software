import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FinancialImmutabilityEngine } from '../../src/domain/financial/financial-immutability.engine.js';

const migrationPath = path.join(
  process.cwd(),
  'src',
  'infrastructure',
  'database',
  'migrations',
  '0004_payment_request_sequences_and_notes.sql',
);

const sql = fs.readFileSync(migrationPath, 'utf8');

describe('Migración 0004: secuencia de solicitudes y persistencia de notas (Fase 4.6)', () => {
  it('debe crear la tabla request_sequences y la función next_request_number', () => {
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS request_sequences'));
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION next_request_number'));
    assert.ok(sql.includes('ON CONFLICT (year) DO UPDATE'));
    assert.ok(sql.includes('RETURNING last_number INTO v_next'));
  });

  it('debe sembrar la secuencia desde las solicitudes existentes', () => {
    assert.ok(sql.includes('FROM payment_requests'));
    assert.ok(sql.includes("request_code ~ '^SOL-[0-9]{4}-[0-9]+$'"));
    assert.ok(sql.includes('GREATEST(request_sequences.last_number, EXCLUDED.last_number)'));
  });

  it('debe añadir la columna notes de forma idempotente', () => {
    assert.ok(sql.includes('ALTER TABLE payment_requests'));
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS notes TEXT'));
  });

  it('debe formatear códigos de solicitud SOL-YYYY-NNN con relleno de 3 dígitos', () => {
    assert.equal(FinancialImmutabilityEngine.formatRequestCode(2026, 1), 'SOL-2026-001');
    assert.equal(FinancialImmutabilityEngine.formatRequestCode(2026, 42), 'SOL-2026-042');
    assert.equal(FinancialImmutabilityEngine.formatRequestCode(2026, 999), 'SOL-2026-999');
    assert.equal(FinancialImmutabilityEngine.formatRequestCode(2026, 1000), 'SOL-2026-1000');
  });

  it('debe generar DDL de tabla y función en FinancialImmutabilityEngine', () => {
    const tableDdl = FinancialImmutabilityEngine.generateRequestSequenceTableDDL();
    const funcDdl = FinancialImmutabilityEngine.generateNextRequestNumberFunctionDDL();

    assert.ok(tableDdl.includes('CREATE TABLE IF NOT EXISTS request_sequences'));
    assert.ok(tableDdl.includes('year INTEGER PRIMARY KEY'));
    assert.ok(funcDdl.includes('CREATE OR REPLACE FUNCTION next_request_number'));
    assert.ok(funcDdl.includes('ON CONFLICT (year) DO UPDATE'));
  });
});
