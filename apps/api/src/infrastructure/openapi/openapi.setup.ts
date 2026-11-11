import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { buildOpenApiDocument } from './openapi.document.js';

/**
 * Activa `/api/docs` (UI) y `/api/docs-json` (documento OpenAPI).
 *
 * Por defecto está activo salvo en producción. Se puede forzar con
 * `ENABLE_SWAGGER=true` o desactivar con `ENABLE_SWAGGER=false` (HANDOFF 4.5).
 */
export function isSwaggerEnabled(): boolean {
  const flag = process.env.ENABLE_SWAGGER;
  if (flag !== undefined) return flag !== 'false' && flag !== '0';
  return process.env.NODE_ENV !== 'production';
}

export function setupOpenApi(app: INestApplication): boolean {
  if (!isSwaggerEnabled()) return false;

  const document = buildOpenApiDocument() as unknown as OpenAPIObject;
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Scienpay API',
    swaggerOptions: { persistAuthorization: true },
  });
  return true;
}
