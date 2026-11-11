import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePaymentGroupInput } from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { PaymentGroup } from '../types/api.types.js';

export const paymentGroupKeys = {
  all: ['payment-groups'] as const,
};

export function usePaymentGroups() {
  return useQuery({
    queryKey: paymentGroupKeys.all,
    queryFn: () => apiClient.get<PaymentGroup[]>('/payment-groups'),
  });
}

export function useCreatePaymentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentGroupInput) =>
      apiClient.post<PaymentGroup>('/payment-groups', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentGroupKeys.all }),
  });
}
