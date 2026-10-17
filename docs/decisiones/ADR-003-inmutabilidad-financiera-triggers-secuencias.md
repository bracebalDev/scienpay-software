# ADR-003: Inmutabilidad Financiera, Triggers de Base de Datos y Secuencias Consecutivas sin Huecos

## Estado
Aceptado

## Contexto
El sistema Scienpay exige que los registros financieros (pagos efectuados, recibos emitidos, causaciones ejecutadas y movimientos de caja chica) sean rigurosamente inmutables. La modificación o borrado arbitrario de transacciones destruye la pista de auditoría. Además, los recibos individuales requieren una numeración correlativa estricta sin huecos para efectos legales y de control.

## Decisión
1. **Inmutabilidad Enforced por Base de Datos:** Se implementan triggers PL/pgSQL `BEFORE UPDATE OR DELETE` sobre las tablas `receipts`, `receipt_allocations`, `disbursements`, `petty_cash_movements` y `audit_log`. Dichos triggers emiten una excepción fatal ante cualquier intento de mutación o eliminación directa, incluso por parte de usuarios con acceso administrativo o scripts no autorizados.
2. **Correcciones mediante Anulaciones Justificadas:** Cualquier error en un lote de causación o solicitud se subsana mediante un proceso formal de anulación que exige justificación en texto (`annulment_reason`), preservando el registro original con su fecha y usuario responsable.
3. **Numeración Consecutiva sin Huecos (*Strict Sequential Numbering*):** Se crea una secuencia dedicada en PostgreSQL (`CREATE SEQUENCE receipt_number_seq`). La obtención del número de recibo se realiza dentro de la transacción de base de datos del desembolso, garantizando monotonicidad y correlatividad estricta sin saltos ni colisiones concurrentes.

## Consecuencias
### Positivas
- Garantía legal de integridad de los registros financieros y trazabilidad completa.
- Se previene cualquier tipo de fraude o manipulación retrospectiva de saldos.

### Negativas / Mitigaciones
- Las transacciones fallidas de desembolso deben gestionarse con rollback completo para no consumir números de recibo prematuramente.
