import { z } from 'zod';

/**
 * Filtros y paginación del registro de auditoría (HANDOFF 2.2).
 * `z.coerce` permite recibir los valores como strings desde query params.
 */
export const auditQuerySchema = z
  .object({
    userId: z.string().uuid('ID de usuario inválido').optional(),
    entity: z.string().trim().max(80, 'La entidad no puede exceder 80 caracteres').optional(),
    action: z.string().trim().max(80, 'La acción no puede exceder 80 caracteres').optional(),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
      .optional(),
    page: z.coerce.number().int().min(1, 'La página debe ser mayor o igual a 1').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'El límite debe ser mayor o igual a 1')
      .max(200, 'El límite máximo es 200')
      .optional()
      .default(50),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    },
    {
      message: 'La fecha final no puede ser anterior a la fecha inicial',
      path: ['dateTo'],
    },
  );

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
