-- Scienpay Database Migration 0003
-- Fase 2.1: numeracion transaccional de vales de caja chica.
-- Corrige ademas el indice de idempotencia de causaciones para permitir
-- regenerar un lote despues de una anulacion formal.

-- =========================================================================
-- 1. Secuencia transaccional de vales de caja chica
-- =========================================================================
CREATE TABLE IF NOT EXISTS voucher_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_voucher_number(p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO voucher_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = voucher_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Sembrar el contador desde los vales existentes con formato VAL-YYYY-NNNN.
INSERT INTO voucher_sequences (year, last_number)
SELECT
  SUBSTRING(voucher_number FROM 5 FOR 4)::INTEGER AS year,
  MAX(SUBSTRING(voucher_number FROM 10)::BIGINT) AS last_number
FROM petty_cash_vouchers
WHERE voucher_number ~ '^VAL-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET last_number = GREATEST(voucher_sequences.last_number, EXCLUDED.last_number);

COMMENT ON TABLE voucher_sequences IS 'Contador transaccional de numeracion correlativa de vales de caja chica.';

-- =========================================================================
-- 2. Idempotencia de causaciones compatible con anulacion
-- =========================================================================
-- La restriccion original impide crear un lote nuevo para el mismo periodo
-- aunque el anterior haya sido anulado. Se sustituye por un indice unico
-- parcial que solo considera lotes activos.
ALTER TABLE causation_batches
  DROP CONSTRAINT IF EXISTS uq_causation_batch_idempotence;

CREATE UNIQUE INDEX IF NOT EXISTS uq_causation_batch_idempotence_active
ON causation_batches (project_id, payment_group_id, period_start_date, period_end_date)
WHERE status <> 'ANULADO';
