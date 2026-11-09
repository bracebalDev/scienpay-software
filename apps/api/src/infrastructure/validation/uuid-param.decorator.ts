import { BadRequestException, Param, ParseUUIDPipe, Query } from '@nestjs/common';

/**
 * Decorador para parámetros de ruta que deben ser UUID.
 *
 * Valida el identificador en el borde HTTP antes de que llegue al servicio.
 * Sin esta validación, PostgreSQL rechaza la consulta con el código `22P02`
 * (`invalid input syntax for type uuid`) y el cliente recibe un 500.
 */
export function UuidParam(name = 'id'): ParameterDecorator {
  return Param(
    name,
    new ParseUUIDPipe({
      exceptionFactory: () =>
        new BadRequestException({
          message: 'UUID_INVALIDO: El identificador de la ruta no es un UUID válido',
          parameter: name,
        }),
    }),
  );
}

/**
 * Variante para query params UUID opcionales.
 */
export function UuidQuery(name: string): ParameterDecorator {
  return Query(
    name,
    new ParseUUIDPipe({
      optional: true,
      exceptionFactory: () =>
        new BadRequestException({
          message: 'UUID_INVALIDO: El parámetro de consulta no es un UUID válido',
          parameter: name,
        }),
    }),
  );
}
