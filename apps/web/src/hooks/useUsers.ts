import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserInput } from '@scienpay/shared';
import { apiClient } from '../lib/apiClient.js';
import type { AuthUser, UserAccount } from '../types/api.types.js';

export const userKeys = {
  all: ['users'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => apiClient.get<UserAccount[]>('/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => apiClient.post<AuthUser>('/users', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

interface UserMutationResponse {
  message: string;
  userId: string;
}

export function useUnlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<UserMutationResponse>(`/users/${id}/unlock`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useResetUserAttempts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<UserMutationResponse>(`/users/${id}/reset-attempts`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
