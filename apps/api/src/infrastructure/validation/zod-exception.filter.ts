import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Filtro global que traduce cualquier `ZodError` no capturado a una respuesta
 * HTTP 400 uniforme con el detalle por campo.
 *
 * Decisión documentada en HANDOFF 1.4: los schemas de `@scienpay/shared` son la
 * única fuente de verdad; el filtro solo se encarga de la traducción HTTP.
 */
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  public catch(exception: ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'DATOS_INVALIDOS: La solicitud contiene campos inválidos',
      details: exception.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });
  }
}
