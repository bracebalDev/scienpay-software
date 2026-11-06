import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentRequestStatus } from '@scienpay/shared';
import { PaymentRequestStateMachine } from '../../src/domain/payment-requests/payment-request-state-machine.js';

describe('Reglas de Negocio: Máquina de Estados de Solicitudes de Pago', () => {
  it('permite la transición válida BORRADOR -> ENVIADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.BORRADOR,
        PaymentRequestStatus.ENVIADA,
      ),
      true,
    );
  });

  it('permite la transición válida ENVIADA -> APROBADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.ENVIADA,
        PaymentRequestStatus.APROBADA,
      ),
      true,
    );
  });

  it('permite la transición válida ENVIADA -> RECHAZADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.ENVIADA,
        PaymentRequestStatus.RECHAZADA,
      ),
      true,
    );
  });

  it('permite la transición válida APROBADA -> ENTREGADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.APROBADA,
        PaymentRequestStatus.ENTREGADA,
      ),
      true,
    );
  });

  it('permite la transición válida ENTREGADA -> CERRADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.ENTREGADA,
        PaymentRequestStatus.CERRADA,
      ),
      true,
    );
  });

  it('RECHAZA transiciones inválidas (ej. pagar o entregar una solicitud rechazada)', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.RECHAZADA,
        PaymentRequestStatus.ENTREGADA,
      ),
      false,
      'Una solicitud rechazada jamás puede pasar a entregada',
    );
  });

  it('RECHAZA entregar fondos directamente a un BORRADOR sin aprobación', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.BORRADOR,
        PaymentRequestStatus.ENTREGADA,
      ),
      false,
    );
  });

  it('RECHAZA reabrir o modificar una solicitud CERRADA', () => {
    assert.equal(
      PaymentRequestStateMachine.canTransition(
        PaymentRequestStatus.CERRADA,
        PaymentRequestStatus.APROBADA,
      ),
      false,
    );
  });
});
