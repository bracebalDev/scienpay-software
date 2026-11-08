import type { FieldErrors, FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

/**
 * Resolver Zod local compatible con React Hook Form (HANDOFF 3.4).
 *
 * `@hookform/resolvers` no está instalado en el monorepo; en lugar de añadir una
 * dependencia no verificada se implementa el contrato mínimo de RHF. Soporta
 * campos planos y anidados simples; los formularios de Scienpay no requieren
 * estructuras más complejas.
 */
export function zodResolver<T extends FieldValues>(schema: ZodTypeAny): Resolver<T> {
  return async (values): Promise<ResolverResult<T>> => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data as T, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path]) {
        errors[path] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return {
      values: {},
      errors: errors as FieldErrors<T>,
    };
  };
}
