import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Pipe reutilizable que valida y transforma el valor de entrada con un schema Zod.
 *
 * Los errores se propagan como `ZodError` y son traducidos por `ZodExceptionFilter`.
 * Uso: `@Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput`.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  public transform(value: unknown, _metadata: ArgumentMetadata): T {
    return this.schema.parse(value);
  }
}
