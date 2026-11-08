import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePaymentRequestInput,
  RejectPaymentRequestInput,
} from '@scienpay/shared';
import { apiClient, saveBlob } from '../lib/apiClient.js';
import type { PaymentRequest } from '../types/api.types.js';
import { causationKeys } from './useCausation.js';

export const paymentRequestKeys = {
  all: ['payment-requests'] as const,
  byProject: (projectId?: string) => ['payment-requests', projectId ?? 'todos'] as const,
};

export function usePaymentRequests(projectId?: string) {
  return useQuery({
    queryKey: paymentRequestKeys.byProject(projectId),
    queryFn: () =>
      apiClient.get<PaymentRequest[]>(
        projectId ? `/payment-requests?projectId=${encodeURIComponent(projectId)}` : '/payment-requests',
      ),
  });
}

function invalidateRequests(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all }),
    queryClient.invalidateQueries({ queryKey: causationKeys.all }),
  ]);
}

export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentRequestInput) =>
      apiClient.post<PaymentRequest>('/payment-requests', input),
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useSendPaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<PaymentRequest>(`/payment-requests/${id}/send`),
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useApprovePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<PaymentRequest>(`/payment-requests/${id}/approve`),
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useRejectPaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RejectPaymentRequestInput }) =>
      apiClient.patch<PaymentRequest>(`/payment-requests/${id}/reject`, input),
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useClosePaymentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<PaymentRequest>(`/payment-requests/${id}/close`),
    onSuccess: () => invalidateRequests(queryClient),
  });
}

export function useDownloadPaymentRequestPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { blob, filename } = await apiClient.download(`/payment-requests/${id}/pdf`);
      saveBlob(blob, filename);
    },
  });
}
