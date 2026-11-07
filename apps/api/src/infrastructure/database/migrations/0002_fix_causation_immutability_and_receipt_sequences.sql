-- Scienpay Database Migration 0002
-- Corrige la inmutabilidad a nivel de columna para el camino crítico de pagos
-- y sustituye la secuencia no transaccional de recibos por un contador transaccional.
-- Referencias: ADR-003 (inmutabilidad financiera), ADR-005 (FIFO), HANDOFF 1.1/1.5/2.5.

-- =========================================================================
-- 1. causation_items: permitir exclusivamente los cambios derivados de pagos
-- =========================================================================
DROP TRIGGER IF EXISTS trg_prevent_mutation_causation_items ON causation_items;

CREATE OR REPLACE FUNCTION enforce_causation_items_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla "causation_items" no admite DELETE. Toda correccion debe efectuarse mediante anulacion formal justificada.', TG_TABLE_NAME
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'ANULADO' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Un item de causacion anulado no admite nuevas modificaciones.'
      USING ERRCODE = '55000';
  END IF;

  -- Columnas inmutables: cualquier cambio en ellas se rechaza.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
     OR NEW.person_id IS DISTINCT FROM OLD.person_id
     OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
     OR NEW.period_start_date IS DISTINCT FROM OLD.period_start_date
     OR NEW.period_end_date IS DISTINCT FROM OLD.period_end_date
     OR NEW.total_days_in_period IS DISTINCT FROM OLD.total_days_in_period
     OR NEW.active_days IS DISTINCT FROM OLD.active_days
     OR NEW.base_amount IS DISTINCT FROM OLD.base_amount
     OR NEW.calculated_amount IS DISTINCT FROM OLD.calculated_amount
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Solo se permite actualizar paid_amount, remaining_debt y status en causation_items.'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status NOT IN ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO_TOTAL', 'ANULADO') THEN
    RAISE EXCEPTION 'ESTADO_CAUSACION_INVALIDO: El estado % no es valido para causation_items.', NEW.status
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_mutation_causation_items
BEFORE UPDATE OR DELETE ON causation_items
FOR EACH ROW EXECUTE FUNCTION enforce_causation_items_immutability();

-- =========================================================================
-- 2. causation_batches: permitir exclusivamente el registro de la anulacion
-- =========================================================================
DROP TRIGGER IF EXISTS trg_prevent_mutation_causation_batches ON causation_batches;

CREATE OR REPLACE FUNCTION enforce_causation_batches_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla "causation_batches" no admite DELETE. Toda correccion debe efectuarse mediante anulacion formal justificada.', TG_TABLE_NAME
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'ANULADO' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Un lote de causacion anulado no admite nuevas modificaciones.'
      USING ERRCODE = '55000';
  END IF;

  -- Columnas inmutables: cualquier cambio en ellas se rechaza.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.payment_group_id IS DISTINCT FROM OLD.payment_group_id
     OR NEW.period_start_date IS DISTINCT FROM OLD.period_start_date
     OR NEW.period_end_date IS DISTINCT FROM OLD.period_end_date
     OR NEW.total_causation_amount IS DISTINCT FROM OLD.total_causation_amount
     OR NEW.calculated_by_user_id IS DISTINCT FROM OLD.calculated_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Solo se permite registrar la anulacion (status, annulment_reason, annulled_by_user_id, annulled_at) en causation_batches.'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status NOT IN ('CALCULADO', 'CON_SOLICITUD', 'ANULADO') THEN
    RAISE EXCEPTION 'ESTADO_LOTE_INVALIDO: El estado % no es valido para causation_batches.', NEW.status
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = 'ANULADO' AND (NEW.annulment_reason IS NULL OR LENGTH(TRIM(NEW.annulment_reason)) < 10) THEN
    RAISE EXCEPTION 'ANULACION_SIN_JUSTIFICACION: La anulacion requiere un motivo de al menos 10 caracteres.'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_mutation_causation_batches
BEFORE UPDATE OR DELETE ON causation_batches
FOR EACH ROW EXECUTE FUNCTION enforce_causation_batches_immutability();

-- =========================================================================
-- 3. Secuencia transaccional de recibos sin huecos (ADR-003)
-- =========================================================================
CREATE TABLE IF NOT EXISTS receipt_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);

-- Reserva atomica del siguiente numero. Al ejecutarse dentro de la transaccion
-- del desembolso, un ROLLBACK revierte tambien el incremento del contador.
CREATE OR REPLACE FUNCTION next_receipt_number(p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO receipt_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = receipt_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Sembrar el contador con los recibos ya existentes para no reiniciar la numeracion.
INSERT INTO receipt_sequences (year, last_number)
SELECT
  SUBSTRING(receipt_number FROM 5 FOR 4)::INTEGER AS year,
  MAX(SUBSTRING(receipt_number FROM 10)::BIGINT) AS last_number
FROM receipts
WHERE receipt_number ~ '^REC-[0-9]{4}-[0-9]{6}$'
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET last_number = GREATEST(receipt_sequences.last_number, EXCLUDED.last_number);

COMMENT ON TABLE receipt_sequences IS 'Contador transaccional de numeracion correlativa de recibos. Reemplaza a receipt_number_seq para eliminar huecos por rollback.';
COMMENT ON SEQUENCE receipt_number_seq IS 'DEPRECADA: conservada por compatibilidad. Usar next_receipt_number(year).';
