import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RegisterDisbursementInput } from '@scienpay/shared';
import { apiClient, saveBlob } from '../lib/apiClient.js';
import type {
  Disbursement,
  Receipt,
  RegisterDisbursementResponse,
} from '../types/api.types.js';
import { causationKeys } from './useCausation.js';
import { paymentRequestKeys } from './usePaymentRequests.js';

export const disbursementKeys = {
  all: ['disbursements'] as const,
  byRequest: (requestId?: string) => ['disbursements', requestId ?? 'todos'] as const,
  receipts: ['receipts'] as const,
};

export function useDisbursements(requestId?: string) {
  return useQuery({
    queryKey: disbursementKeys.byRequest(requestId),
    queryFn: () =>
      apiClient.get<Disbursement[]>(
        requestId ? `/disbursements?requestId=${encodeURIComponent(requestId)}` : '/disbursements',
      ),
  });
}

export function useReceipts(personId?: string) {
  return useQuery({
    queryKey: [...disbursementKeys.receipts, personId ?? 'todos'],
    queryFn: () =>
      apiClient.get<Receipt[]>(
        personId ? `/disbursements/receipts?personId=${encodeURIComponent(personId)}` : '/disbursements/receipts',
      ),
  });
}

export function useRegisterDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterDisbursementInput) =>
      apiClient.post<RegisterDisbursementResponse>('/disbursements', input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all }),
        queryClient.invalidateQueries({ queryKey: causationKeys.all }),
        queryClient.invalidateQueries({ queryKey: disbursementKeys.all }),
        queryClient.invalidateQueries({ queryKey: disbursementKeys.receipts }),
      ]),
  });
}

export function useDownloadReceiptPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await apiClient.download(`/disbursements/receipts/${id}/pdf`);
      saveBlob(blob, filename);
    },
  });
}
