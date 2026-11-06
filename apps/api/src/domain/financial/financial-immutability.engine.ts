/**
 * Motor de Inmutabilidad Financiera y Generador de Triggers (ADR-003 & Especificación).
 * Garantiza que en la base de datos PostgreSQL, ninguna tabla de transacciones financieras
 * admita mutaciones (UPDATE) o eliminaciones (DELETE).
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

  public static getImmutableTables(): string[] {
    return [...this.IMMUTABLE_TABLES];
  }

  /**
   * Genera la función trigger PL/pgSQL que intercepta UPDATE o DELETE y genera excepción fatal.
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
   * Genera los triggers individuales para cada tabla financiera inmutable.
   */
  public static generateAllTableTriggers(): string[] {
    return this.IMMUTABLE_TABLES.map((table) => {
      const triggerName = `trg_prevent_mutation_${table}`;
      return `
DROP TRIGGER IF EXISTS ${triggerName} ON ${table};
CREATE TRIGGER ${triggerName}
BEFORE UPDATE OR DELETE ON ${table}
FOR EACH ROW
EXECUTE FUNCTION enforce_financial_immutability();
`.trim();
    });
  }

  /**
   * Genera la secuencia dedicada de PostgreSQL para recibos sin saltos.
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
   * Formatea un número correlativo de recibo en formato estándar: REC-YYYY-000000.
   */
  public static formatReceiptNumber(year: number, sequenceNumber: number): string {
    const padded = sequenceNumber.toString().padStart(6, '0');
    return `REC-${year}-${padded}`;
  }
}
