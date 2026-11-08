import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePersonInput, UpdatePersonInput } from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { Person } from '../types/api.types.js';

export const personKeys = {
  all: ['persons'] as const,
  detail: (id: string) => ['persons', id] as const,
};

export function usePersons() {
  return useQuery({
    queryKey: personKeys.all,
    queryFn: () => apiClient.get<Person[]>('/persons'),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonInput) => apiClient.post<Person>('/persons', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personKeys.all }),
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePersonInput }) =>
      apiClient.patch<Person>(`/persons/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personKeys.all }),
  });
}
