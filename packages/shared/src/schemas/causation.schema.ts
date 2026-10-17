import { z } from 'zod';

export const previewCausationSchema = z
  .object({
    projectId: z.string().uuid('ID de proyecto inválido'),
    paymentGroupId: z.string().uuid('ID de grupo de pago inválido'),
    periodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    periodEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  })
  .refine((data) => new Date(data.periodEndDate) >= new Date(data.periodStartDate), {
    message: 'La fecha de fin del período no puede ser anterior a la fecha de inicio',
    path: ['periodEndDate'],
  });

export type PreviewCausationInput = z.infer<typeof previewCausationSchema>;

export const generateCausationBatchSchema = previewCausationSchema;
export type GenerateCausationBatchInput = z.infer<typeof generateCausationBatchSchema>;

export const annulCausationBatchSchema = z.object({
  annulmentReason: z
    .string()
    .trim()
    .min(10, 'La justificación de anulación debe contener al menos 10 caracteres')
    .max(1000),
});

export type AnnulCausationBatchInput = z.infer<typeof annulCausationBatchSchema>;
