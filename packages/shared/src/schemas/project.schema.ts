import { z } from 'zod';
import { ProjectArea, ProjectScope, ProjectStatus } from '../enums/project.enum.js';

export const baseProjectSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(20, 'El código no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9_-]+$/, 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  area: z.nativeEnum(ProjectArea, { errorMap: () => ({ message: 'Área de proyecto inválida' }) }),
  scope: z.nativeEnum(ProjectScope, { errorMap: () => ({ message: 'Ámbito de proyecto inválido' }) }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .optional()
    .nullable(),
});

export const createProjectSchema = baseProjectSchema.refine(
  (data) => {
    if (!data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['endDate'],
  },
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = baseProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
