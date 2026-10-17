# ADR-005: Algoritmo de Aplicación de Pagos Parciales por FIFO

## Estado
Aceptado

## Contexto
En escenarios de liquidez parcial, el Receptor puede registrar un desembolso por un monto inferior a la totalidad de la deuda acumulada de un beneficiario en un proyecto determinado. Es indispensable contar con un algoritmo predecible e incontrovertible que determine qué cuotas o causaciones se consideran saldadas y cuáles permanecen adeudadas.

## Decisión
Se implementa el algoritmo **FIFO (First-In, First-Out / Primero en entrar, primero en salir)**:
1. Al procesar un desembolso por monto $M$ para una persona $P$ en el proyecto $X$, se recuperan todos los `causation_items` pendientes (`status IN ('PENDIENTE', 'PAGADO_PARCIAL')`) ordenados cronológicamente por `period_start_date ASC, created_at ASC`.
2. Por cada ítem, se calcula la deuda remanente $S_i = \text{calculated\_amount} - \text{paid\_amount}$.
3. Si $M \ge S_i$: el ítem se salda por completo, su estado pasa a `PAGADO_TOTAL`, `paid_amount += S_i`, `remaining_debt = 0.00`, $M$ se reduce en $S_i$, y se crea un registro en `receipt_allocations`.
4. Si $0 < M < S_i$: el ítem recibe un abono parcial por $M$, su estado pasa a `PAGADO_PARCIAL`, `paid_amount += M`, `remaining_debt = S_i - M`, $M$ pasa a $0.00$, y se crea el registro correspondiente en `receipt_allocations`.
5. Si $M = 0$, la iteración concluye y se emite el recibo individual inmutable que desglosa detalladamente cada imputación efectuada.

## Consecuencias
### Positivas
- Se garantiza la amortización prioritaria de las obligaciones más antiguas.
- Transparencia total en el historial de cobro del beneficiario.

### Negativas / Mitigaciones
- La operación debe ejecutarse dentro de una transacción serializable o con bloqueo pesimista (`FOR UPDATE`) sobre los ítems de causación involucrados para evitar condiciones de carrera concurrentes.
