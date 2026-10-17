import { z } from 'zod';

export const createPersonSchema = z.object({
  documentType: z.string().trim().min(1, 'El tipo de documento es obligatorio').max(10).default('V'),
  documentNumber: z
    .string()
    .trim()
    .min(5, 'El documento debe tener al menos 5 caracteres')
    .max(30, 'El documento no puede exceder 30 caracteres')
    .regex(/^[A-Za-z0-9-]+$/, 'El documento solo puede contener caracteres alfanuméricos y guiones'),
  firstName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  lastName: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(80),
  email: z.string().trim().email('Correo electrónico inválido').toLowerCase().optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const updatePersonSchema = createPersonSchema.partial().extend({
  status: z.enum(['ACTIVO', 'INACTIVO']).optional(),
});

export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
