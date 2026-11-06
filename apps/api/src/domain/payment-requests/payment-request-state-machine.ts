import { PaymentRequestStatus } from '@scienpay/shared';

/**
 * Máquina de Estados para Solicitudes de Pago (Función Pura de Dominio).
 * Transiciones válidas:
 * BORRADOR -> ENVIADA -> APROBADA / RECHAZADA -> ENTREGADA -> CERRADA
 * Anulación formal justificada permitida desde BORRADOR, ENVIADA o RECHAZADA.
 */
export class PaymentRequestStateMachine {
  private static readonly VALID_TRANSITIONS: Record<
    PaymentRequestStatus,
    ReadonlySet<PaymentRequestStatus>
  > = {
    [PaymentRequestStatus.BORRADOR]: new Set([
      PaymentRequestStatus.ENVIADA,
      PaymentRequestStatus.ANULADA,
    ]),

    [PaymentRequestStatus.ENVIADA]: new Set([
      PaymentRequestStatus.APROBADA,
      PaymentRequestStatus.RECHAZADA,
      PaymentRequestStatus.ANULADA,
    ]),

    [PaymentRequestStatus.APROBADA]: new Set([
      PaymentRequestStatus.ENTREGADA,
      PaymentRequestStatus.ANULADA,
    ]),

    [PaymentRequestStatus.RECHAZADA]: new Set([
      PaymentRequestStatus.ANULADA,
    ]),

    [PaymentRequestStatus.ENTREGADA]: new Set([
      PaymentRequestStatus.CERRADA,
    ]),

    [PaymentRequestStatus.CERRADA]: new Set([]), // Estado final
    [PaymentRequestStatus.ANULADA]: new Set([]), // Estado final
  };

  public static canTransition(
    currentStatus: PaymentRequestStatus,
    targetStatus: PaymentRequestStatus,
  ): boolean {
    const allowed = this.VALID_TRANSITIONS[currentStatus];
    if (!allowed) {
      return false;
    }
    return allowed.has(targetStatus);
  }

  public static assertValidTransition(
    currentStatus: PaymentRequestStatus,
    targetStatus: PaymentRequestStatus,
  ): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new Error(
        `TRANSICION_ESTADO_INVALIDA: No es posible transicionar la solicitud desde '${currentStatus}' hacia '${targetStatus}'`,
      );
    }
  }
}
