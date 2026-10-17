import { z } from 'zod';
import { Periodicity } from '../enums/payment.enum.js';

export const createPaymentGroupSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  periodicity: z.nativeEnum(Periodicity, {
    errorMap: () => ({ message: 'Periodicidad inválida (SEMANAL, QUINCENAL, MENSUAL)' }),
  }),
  cutOffConfig: z
    .object({
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(), // 0 = Domingo, 6 = Sábado
      customCalendar: z.record(z.string()).optional(),
    })
    .default({}),
  description: z.string().trim().max(500).optional().default(''),
});

export type CreatePaymentGroupInput = z.infer<typeof createPaymentGroupSchema>;
