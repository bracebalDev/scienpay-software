/**
 * Motor de Inmutabilidad Financiera y Generador de Triggers (ADR-003 & Especificación).
 * Garantiza que en la base de datos PostgreSQL, ninguna tabla de transacciones financieras
 * admita mutaciones (UPDATE) o eliminaciones (DELETE), salvo las columnas estrictamente
 * necesarias para el ciclo de pagos y la anulación formal justificada.
 */
export class FinancialImmutabilityEngine {
  private static readonly IMMUTABLE_TABLES = [
    'causation_batches',
    'causation_items',
    'payment_requests',
    'disbursements',
    'receipts',
    'receipt_allocations',
    'petty_cash_movements',
    'audit_log',
  ] as const;

  /**
   * Columnas de causation_items que el motor FIFO puede actualizar.
   * Cualquier otra columna permanece estrictamente inmutable.
   */
  public static readonly CAUSATION_ITEM_MUTABLE_COLUMNS = [
    'paid_amount',
    'remaining_debt',
    'status',
  ] as const;

  /**
   * Columnas de causation_batches que la anulación formal puede actualizar.
   */
  public static readonly CAUSATION_BATCH_MUTABLE_COLUMNS = [
    'status',
    'annulment_reason',
    'annulled_by_user_id',
    'annulled_at',
  ] as const;

  public static getImmutableTables(): string[] {
    return [...this.IMMUTABLE_TABLES];
  }

  /**
   * Genera la función trigger PL/pgSQL que intercepta UPDATE o DELETE y genera excepción fatal.
   * Se aplica a las tablas completamente inmutables.
   */
  public static generateImmutabilityTriggerFunction(): string {
    return `
CREATE OR REPLACE FUNCTION enforce_financial_immutability()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla "%" es estrictamente inmutable. Toda correccion contable debe efectuarse mediante una anulacion formal justificada con motivo registrado.', TG_TABLE_NAME
    USING ERRCODE = '55000'; -- Object not in prerequisite state / restricted
END;
$$ LANGUAGE plpgsql;
`.trim();
  }

  /**
   * Trigger específico de causation_items: permite únicamente los cambios derivados de pagos.
   */
  public static generateCausationItemsTriggerFunction(): string {
    return `
CREATE OR REPLACE FUNCTION enforce_causation_items_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla % no admite DELETE. Toda correccion debe efectuarse mediante anulacion formal justificada.', TG_TABLE_NAME
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'ANULADO' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Un item de causacion anulado no admite nuevas modificaciones.'
      USING ERRCODE = '55000';
  END IF;

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
`.trim();
  }

  /**
   * Trigger específico de causation_batches: permite únicamente registrar la anulación.
   */
  public static generateCausationBatchesTriggerFunction(): string {
    return `
CREATE OR REPLACE FUNCTION enforce_causation_batches_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: La tabla % no admite DELETE. Toda correccion debe efectuarse mediante anulacion formal justificada.', TG_TABLE_NAME
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'ANULADO' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INTEGRIDAD_FINANCIERA: Un lote de causacion anulado no admite nuevas modificaciones.'
      USING ERRCODE = '55000';
  END IF;

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
`.trim();
  }

  /**
   * Genera los triggers individuales para cada tabla financiera.
   * causation_items y causation_batches usan funciones de columna específicas.
   */
  public static generateAllTableTriggers(): string[] {
    return this.IMMUTABLE_TABLES.map((table) => {
      const triggerName = `trg_prevent_mutation_${table}`;
      const triggerFunction =
        table === 'causation_items'
          ? 'enforce_causation_items_immutability()'
          : table === 'causation_batches'
            ? 'enforce_causation_batches_immutability()'
            : 'enforce_financial_immutability()';

      return `
DROP TRIGGER IF EXISTS ${triggerName} ON ${table};
CREATE TRIGGER ${triggerName}
BEFORE UPDATE OR DELETE ON ${table}
FOR EACH ROW
EXECUTE FUNCTION ${triggerFunction};
`.trim();
    });
  }

  /**
   * Genera la secuencia dedicada de PostgreSQL (deprecada).
   * Se conserva por compatibilidad; el mecanismo vigente es next_receipt_number(year).
   */
  public static generateReceiptSequenceDDL(): string {
    return `
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
`.trim();
  }

  /**
   * Genera la tabla contador transaccional de recibos.
   */
  public static generateReceiptSequenceTableDDL(): string {
    return `
CREATE TABLE IF NOT EXISTS receipt_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);
`.trim();
  }

  /**
   * Genera la función transaccional que reserva el siguiente número de recibo.
   * Un ROLLBACK de la transacción revierte el incremento del contador.
   */
  public static generateNextReceiptNumberFunctionDDL(): string {
    return `
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
`.trim();
  }

  /**
   * Formatea un número correlativo de recibo en formato estándar: REC-YYYY-000000.
   */
  public static formatReceiptNumber(year: number, sequenceNumber: number): string {
    const padded = sequenceNumber.toString().padStart(6, '0');
    return `REC-${year}-${padded}`;
  }

  /**
   * Genera la tabla contador transaccional de solicitudes de pago.
   */
  public static generateRequestSequenceTableDDL(): string {
    return `
CREATE TABLE IF NOT EXISTS request_sequences (
  year INTEGER PRIMARY KEY,
  last_number BIGINT NOT NULL DEFAULT 0
);
`.trim();
  }

  /**
   * Genera la función transaccional que reserva el siguiente número de solicitud.
   */
  public static generateNextRequestNumberFunctionDDL(): string {
    return `
CREATE OR REPLACE FUNCTION next_request_number(p_year INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO request_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = request_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;
`.trim();
  }

  /**
   * Formatea un código correlativo de solicitud de pago: SOL-YYYY-NNN.
   */
  public static formatRequestCode(year: number, sequenceNumber: number): string {
    const padded = sequenceNumber.toString().padStart(3, '0');
    return `SOL-${year}-${padded}`;
  }
}
