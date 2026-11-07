import { CausationBatchStatus } from '@scienpay/shared';

export type CausationAnnulmentBlockReason =
  | 'LOTE_NO_ENCONTRADO'
  | 'LOTE_YA_ANULADO'
  | 'LOTE_CON_SOLICITUDES'
  | 'LOTE_CON_PAGOS';

export interface CausationAnnulmentState {
  exists: boolean;
  status: string;
  hasRequests: boolean;
  hasPayments: boolean;
}

/**
 * Política pura de anulación de lotes de causación (HANDOFF 1.5).
 *
 * La anulación es la única corrección permitida sobre un lote ya generado.
 * Se bloquea cuando el lote no existe, ya fue anulado, ya originó solicitudes
 * de pago o registra pagos aplicados sobre sus ítems.
 */
export class CausationAnnulmentPolicy {
  public static evaluate(
    state: CausationAnnulmentState,
  ): CausationAnnulmentBlockReason | null {
    if (!state.exists) return 'LOTE_NO_ENCONTRADO';
    if (state.status === CausationBatchStatus.ANULADO) return 'LOTE_YA_ANULADO';
    if (state.hasRequests) return 'LOTE_CON_SOLICITUDES';
    if (state.hasPayments) return 'LOTE_CON_PAGOS';
    return null;
  }
}
