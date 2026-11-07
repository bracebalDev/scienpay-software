import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auditQuerySchema } from '@scienpay/shared';

describe('Filtros y paginación de auditoría (Fase 2.2)', () => {
  it('debe aplicar page=1 y limit=50 por defecto', () => {
    const parsed = auditQuerySchema.parse({});

    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, 50);
  });

  it('debe coercionar los strings de query params a números', () => {
    const parsed = auditQuerySchema.parse({ page: '2', limit: '100' });

    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 100);
  });

  it('debe rechazar un límite superior a 200', () => {
    assert.equal(auditQuerySchema.safeParse({ limit: '201' }).success, false);
  });

  it('debe rechazar una página menor a 1', () => {
    assert.equal(auditQuerySchema.safeParse({ page: '0' }).success, false);
  });

  it('debe rechazar un rango de fechas invertido', () => {
    const result = auditQuerySchema.safeParse({
      dateFrom: '2026-02-01',
      dateTo: '2026-01-01',
    });

    assert.equal(result.success, false);
  });

  it('debe rechazar un userId que no es UUID', () => {
    assert.equal(auditQuerySchema.safeParse({ userId: 'no-es-uuid' }).success, false);
  });

  it('debe aceptar filtros combinados válidos', () => {
    const result = auditQuerySchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      entity: 'causation_batches',
      action: 'ANULACION_CAUSACION',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      page: '1',
      limit: '20',
    });

    assert.equal(result.success, true);
  });
});
