import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnnulCausationBatchInput,
  GenerateCausationBatchInput,
  PreviewCausationInput,
} from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type {
  CausationBatch,
  CausationBatchDetail,
  CausationPreview,
} from '../types/api.types.js';

export const causationKeys = {
  all: ['causation-batches'] as const,
  byProject: (projectId?: string) => ['causation-batches', projectId ?? 'todos'] as const,
  detail: (id: string) => ['causation-batches', 'detail', id] as const,
};

export function useCausationBatches(projectId?: string) {
  return useQuery({
    queryKey: causationKeys.byProject(projectId),
    queryFn: () =>
      apiClient.get<CausationBatch[]>(
        projectId ? `/causation/batches?projectId=${encodeURIComponent(projectId)}` : '/causation/batches',
      ),
  });
}

export function useCausationBatch(id: string | null) {
  return useQuery({
    queryKey: causationKeys.detail(id ?? ''),
    queryFn: () => apiClient.get<CausationBatchDetail>(`/causation/batches/${id}`),
    enabled: Boolean(id),
  });
}

export function usePreviewCausation() {
  return useMutation({
    mutationFn: (input: PreviewCausationInput) =>
      apiClient.post<CausationPreview>('/causation/preview', input),
  });
}

export function useGenerateCausationBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateCausationBatchInput) =>
      apiClient.post<{ message: string; batch: CausationBatch; itemsCount: number }>(
        '/causation/generate',
        input,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: causationKeys.all }),
  });
}

export function useAnnulCausationBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AnnulCausationBatchInput }) =>
      apiClient.post<CausationBatch>(`/causation/batches/${id}/annul`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: causationKeys.all }),
  });
}
