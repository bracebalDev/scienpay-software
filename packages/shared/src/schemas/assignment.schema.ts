import { z } from 'zod';
import { CURRENCY, FINANCIAL_RULES } from '../constants/currency.constants.js';

export const createAssignmentSchema = z
  .object({
    personId: z.string().uuid('ID de persona inválido'),
    projectId: z.string().uuid('ID de proyecto inválido'),
    paymentGroupId: z.string().uuid('ID de grupo de pago inválido'),
    amountPerPeriod: z
      .number()
      .min(FINANCIAL_RULES.MIN_AMOUNT, `El monto mínimo es ${FINANCIAL_RULES.MIN_AMOUNT}`)
      .max(FINANCIAL_RULES.MAX_AMOUNT, 'El monto excede el límite máximo permitido'),
    currency: z.literal(CURRENCY.CODE).default(CURRENCY.CODE),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
      .optional()
      .nullable(),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: 'La fecha de fin de la asignación no puede ser anterior a la fecha de inicio',
      path: ['endDate'],
    },
  );

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const terminateAssignmentSchema = z.object({
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  reason: z.string().trim().min(5, 'Se requiere justificación para la finalización').max(500),
});

export type TerminateAssignmentInput = z.infer<typeof terminateAssignmentSchema>;
