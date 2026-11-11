import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodResolver } from './zodResolver.js';

describe('zodResolver — Resolver Zod para React Hook Form (HANDOFF 3.4 & 4.6.3)', () => {
  const schema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    amount: z.number().min(1, 'El monto debe ser al menos 1'),
  });

  type FormData = z.infer<typeof schema>;
  const resolver = zodResolver<FormData>(schema);

  it('debe devolver values y errors vacíos cuando la validación es exitosa', async () => {
    const validData = { name: 'Proyecto Alfa', amount: 500 };
    const result = await resolver(validData, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors).toEqual({});
    expect(result.values).toEqual(validData);
  });

  it('debe devolver errores estructurados por campo cuando la validación falla', async () => {
    const invalidData = { name: 'A', amount: 0 };
    const result = await resolver(invalidData, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.values).toEqual({});
    expect(result.errors.name).toBeDefined();
    expect(result.errors.name?.message).toBe('El nombre debe tener al menos 3 caracteres');
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.amount?.message).toBe('El monto debe ser al menos 1');
  });

  it('debe admitir campos anidados mapeando los paths con puntos', async () => {
    const nestedSchema = z.object({
      config: z.object({
        periodDays: z.number().min(15, 'Mínimo 15 días'),
      }),
    });

    type NestedData = z.infer<typeof nestedSchema>;
    const nestedResolver = zodResolver<NestedData>(nestedSchema);

    const result = await nestedResolver({ config: { periodDays: 5 } }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    const errMap = result.errors as Record<string, { type?: string; message?: string }>;
    expect(errMap['config.periodDays']).toBeDefined();
    expect(errMap['config.periodDays']?.message).toBe('Mínimo 15 días');
  });
});
