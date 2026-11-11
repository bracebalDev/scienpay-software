import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectInput, UpdateProjectInput } from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { Project } from '../types/api.types.js';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => apiClient.get<Project[]>('/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => apiClient.post<Project>('/projects', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      apiClient.patch<Project>(`/projects/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
