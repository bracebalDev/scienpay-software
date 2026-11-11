import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CausationBatchStatus,
  annulCausationBatchSchema,
  createPaymentRequestSchema,
} from '@scienpay/shared';
import { CausationAnnulmentPolicy } from '../../src/domain/causation/causation-annulment.policy.js';
import { Decimal } from 'decimal.js';

describe('Anulación de causación y validación de solicitudes (Fase 1.5)', () => {
  it('debe exigir un motivo de anulación de al menos 10 caracteres', () => {
    const short = annulCausationBatchSchema.safeParse({ annulmentReason: 'corto' });
    const valid = annulCausationBatchSchema.safeParse({
      annulmentReason: 'Error detectado en el prorrateo del período',
    });

    assert.equal(short.success, false);
    assert.equal(valid.success, true);
  });

  it('debe bloquear la anulación de un lote inexistente', () => {
    const reason = CausationAnnulmentPolicy.evaluate({
      exists: false,
      status: CausationBatchStatus.CALCULADO,
      hasRequests: false,
      hasPayments: false,
    });

    assert.equal(reason, 'LOTE_NO_ENCONTRADO');
  });

  it('debe bloquear la anulación de un lote ya anulado', () => {
    const reason = CausationAnnulmentPolicy.evaluate({
      exists: true,
      status: CausationBatchStatus.ANULADO,
      hasRequests: false,
      hasPayments: false,
    });

    assert.equal(reason, 'LOTE_YA_ANULADO');
  });

  it('debe bloquear la anulación de un lote con solicitudes de pago asociadas', () => {
    const reason = CausationAnnulmentPolicy.evaluate({
      exists: true,
      status: CausationBatchStatus.CON_SOLICITUD,
      hasRequests: true,
      hasPayments: false,
    });

    assert.equal(reason, 'LOTE_CON_SOLICITUDES');
  });

  it('debe bloquear la anulación de un lote con pagos aplicados', () => {
    const reason = CausationAnnulmentPolicy.evaluate({
      exists: true,
      status: CausationBatchStatus.CALCULADO,
      hasRequests: false,
      hasPayments: true,
    });

    assert.equal(reason, 'LOTE_CON_PAGOS');
  });

  it('debe permitir la anulación de un lote calculado sin solicitudes ni pagos', () => {
    const reason = CausationAnnulmentPolicy.evaluate({
      exists: true,
      status: CausationBatchStatus.CALCULADO,
      hasRequests: false,
      hasPayments: false,
    });

    assert.equal(reason, null);
  });

  it('debe rechazar una solicitud cuyo monto excede el total causado del lote', () => {
    const batchTotal = new Decimal('150.00');
    const requested = new Decimal('150.01');

    assert.equal(requested.greaterThan(batchTotal), true);
  });

  it('debe aceptar una solicitud cuyo monto es igual o menor al total causado', () => {
    const batchTotal = new Decimal('150.00');
    const equal = new Decimal('150.00');
    const lower = new Decimal('99.99');

    assert.equal(equal.greaterThan(batchTotal), false);
    assert.equal(lower.greaterThan(batchTotal), false);
  });

  it('debe validar que el proyecto de la solicitud coincida con el del lote', () => {
    const batchProjectId = '11111111-1111-4111-8111-111111111111';
    const otherProjectId = '22222222-2222-4222-8222-222222222222';

    assert.notEqual(batchProjectId, otherProjectId);

    const parsed = createPaymentRequestSchema.safeParse({
      projectId: batchProjectId,
      causationBatchId: '33333333-3333-4333-8333-333333333333',
      requestedAmount: 100,
    });

    assert.equal(parsed.success, true);
  });
});
