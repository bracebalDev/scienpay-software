import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient.js';
import type { AuditFilters, AuditLogEntry, Paginated } from '../types/api.types.js';

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters: AuditFilters) => ['audit', filters] as const,
};

export function useAuditLogs(filters: AuditFilters) {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.entity) params.set('entity', filters.entity);
  if (filters.action) params.set('action', filters.action);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 25));

  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => apiClient.get<Paginated<AuditLogEntry>>(`/audit?${params.toString()}`),
  });
}
