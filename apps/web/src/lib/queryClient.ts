import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente TanStack Query único (HANDOFF 3.1).
 * Sin reintentos agresivos para no multiplicar efectos de mutaciones fallidas.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
