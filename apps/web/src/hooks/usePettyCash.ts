import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePettyCashInput,
  OpenPettyCashPeriodInput,
  RenderPettyCashVoucherInput,
  RequestPettyCashVoucherInput,
} from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { PettyCash, PettyCashPeriod, PettyCashVoucher } from '../types/api.types.js';

export const pettyCashKeys = {
  all: ['petty-cash'] as const,
  periods: (cashId: string) => ['petty-cash', cashId, 'periods'] as const,
  vouchers: (periodId: string) => ['petty-cash', 'periods', periodId, 'vouchers'] as const,
};

export function usePettyCashes() {
  return useQuery({
    queryKey: pettyCashKeys.all,
    queryFn: () => apiClient.get<PettyCash[]>('/petty-cash'),
  });
}

export function usePettyCashPeriods(cashId: string | null) {
  return useQuery({
    queryKey: pettyCashKeys.periods(cashId ?? ''),
    queryFn: () => apiClient.get<PettyCashPeriod[]>(`/petty-cash/${cashId}/periods`),
    enabled: Boolean(cashId),
  });
}

export function usePettyCashVouchers(periodId: string | null) {
  return useQuery({
    queryKey: pettyCashKeys.vouchers(periodId ?? ''),
    queryFn: () => apiClient.get<PettyCashVoucher[]>(`/petty-cash/periods/${periodId}/vouchers`),
    enabled: Boolean(periodId),
  });
}

export function useCreatePettyCash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePettyCashInput) => apiClient.post<PettyCash>('/petty-cash', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pettyCashKeys.all }),
  });
}

export function useOpenPettyCashPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cashId, input }: { cashId: string; input: OpenPettyCashPeriodInput }) =>
      apiClient.post<PettyCashPeriod>(`/petty-cash/${cashId}/periods`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pettyCashKeys.all }),
  });
}

export function useRequestPettyCashVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, input }: { periodId: string; input: RequestPettyCashVoucherInput }) =>
      apiClient.post<PettyCashVoucher>(`/petty-cash/periods/${periodId}/vouchers`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pettyCashKeys.all }),
  });
}

function useVoucherAction<TInput>(action: string, body?: (input: TInput) => unknown) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: TInput }) =>
      apiClient.patch<PettyCashVoucher>(
        `/petty-cash/vouchers/${id}/${action}`,
        body && input !== undefined ? body(input) : undefined,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pettyCashKeys.all }),
  });
}

export function useApprovePettyCashVoucher() {
  return useVoucherAction<void>('approve');
}

export function useDisbursePettyCashVoucher() {
  return useVoucherAction<void>('disburse');
}

export function useRenderPettyCashVoucher() {
  return useVoucherAction<RenderPettyCashVoucherInput>('render', (input) => input);
}

export function useClosePettyCashPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) =>
      apiClient.patch<PettyCashPeriod>(`/petty-cash/periods/${periodId}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pettyCashKeys.all }),
  });
}
