import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAssignmentInput, TerminateAssignmentInput } from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { Assignment } from '../types/api.types.js';

export const assignmentKeys = {
  all: ['assignments'] as const,
  byProject: (projectId?: string) => ['assignments', projectId ?? 'todos'] as const,
};

export function useAssignments(projectId?: string) {
  return useQuery({
    queryKey: assignmentKeys.byProject(projectId),
    queryFn: () =>
      apiClient.get<Assignment[]>(
        projectId ? `/assignments?projectId=${encodeURIComponent(projectId)}` : '/assignments',
      ),
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) =>
      apiClient.post<Assignment>('/assignments', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useTerminateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TerminateAssignmentInput }) =>
      apiClient.patch<Assignment>(`/assignments/${id}/terminate`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}
