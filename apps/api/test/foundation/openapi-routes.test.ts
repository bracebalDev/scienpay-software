import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { HealthController } from '../../src/health/health.controller.js';
import { AuthController } from '../../src/infrastructure/auth/auth.controller.js';
import { UsersController } from '../../src/modules/users/users.controller.js';
import { ProjectsController } from '../../src/modules/projects/projects.controller.js';
import { PersonsController } from '../../src/modules/persons/persons.controller.js';
import { PaymentGroupsController } from '../../src/modules/payment-groups/payment-groups.controller.js';
import { AssignmentsController } from '../../src/modules/assignments/assignments.controller.js';
import { CausationController } from '../../src/modules/causation/causation.controller.js';
import { PaymentRequestsController } from '../../src/modules/payment-requests/payment-requests.controller.js';
import { DisbursementsController } from '../../src/modules/disbursements/disbursements.controller.js';
import { PettyCashController } from '../../src/modules/petty-cash/petty-cash.controller.js';
import { AuditController } from '../../src/modules/audit/audit.controller.js';
import { OPENAPI_ROUTES } from '../../src/infrastructure/openapi/openapi.routes.js';
import { buildOpenApiDocument } from '../../src/infrastructure/openapi/openapi.document.js';

const CONTROLLERS = [
  HealthController,
  AuthController,
  UsersController,
  ProjectsController,
  PersonsController,
  PaymentGroupsController,
  AssignmentsController,
  CausationController,
  PaymentRequestsController,
  DisbursementsController,
  PettyCashController,
  AuditController,
];

const METHOD_MAP: Record<number, string> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
};

function extractControllerRoutes() {
  const routes: Array<{ method: string; path: string; controller: string; handler: string }> = [];

  for (const Ctrl of CONTROLLERS) {
    const prefix = Reflect.getMetadata('path', Ctrl) || '';
    const proto = Ctrl.prototype as Record<string, unknown>;

    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor') continue;
      const subPath = Reflect.getMetadata('path', proto[name] as object);
      const methodNum = Reflect.getMetadata('method', proto[name] as object) as number | undefined;

      if (methodNum !== undefined) {
        const method = METHOD_MAP[methodNum];
        const segments = [prefix, subPath].filter(Boolean);
        const rawPath = '/' + segments.join('/').replace(/\/+/g, '/').replace(/\/$/, '');
        // Convertir :param a {param}
        const openApiPath = (rawPath || '/').replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
        routes.push({ method, path: openApiPath, controller: Ctrl.name, handler: name });
      }
    }
  }

  return routes;
}

describe('OpenAPI / Swagger — Cobertura y Consistencia de Rutas (HANDOFF 4.5)', () => {
  const controllerRoutes = extractControllerRoutes();

  it('debe registrar todos los endpoints de los controladores en OPENAPI_ROUTES', () => {
    const openApiSet = new Set(OPENAPI_ROUTES.map((r) => `${r.method.toUpperCase()} ${r.path}`));
    const missing: string[] = [];

    for (const route of controllerRoutes) {
      const key = `${route.method.toUpperCase()} ${route.path}`;
      if (!openApiSet.has(key)) {
        missing.push(`${key} (${route.controller}.${route.handler})`);
      }
    }

    assert.deepEqual(
      missing,
      [],
      `Rutas de controladores faltantes en OPENAPI_ROUTES: ${missing.join(', ')}`,
    );
  });

  it('no debe tener rutas en OPENAPI_ROUTES que no existan en ningún controlador', () => {
    const ctrlSet = new Set(controllerRoutes.map((r) => `${r.method.toUpperCase()} ${r.path}`));
    const extra: string[] = [];

    for (const route of OPENAPI_ROUTES) {
      const key = `${route.method.toUpperCase()} ${route.path}`;
      if (!ctrlSet.has(key)) {
        extra.push(key);
      }
    }

    assert.deepEqual(extra, [], `Rutas huérfanas en OPENAPI_ROUTES: ${extra.join(', ')}`);
  });

  it('todas las rutas en OPENAPI_ROUTES deben tener operationId, summary y tag válidos', () => {
    const operationIds = new Set<string>();

    for (const route of OPENAPI_ROUTES) {
      assert.ok(route.operationId, `Ruta ${route.method} ${route.path} carece de operationId`);
      assert.ok(route.summary, `Ruta ${route.method} ${route.path} carece de summary`);
      assert.ok(route.tag, `Ruta ${route.method} ${route.path} carece de tag`);

      assert.equal(
        operationIds.has(route.operationId),
        false,
        `operationId duplicado '${route.operationId}' en ${route.method} ${route.path}`,
      );
      operationIds.add(route.operationId);
    }
  });

  it('buildOpenApiDocument() debe generar un documento OpenAPI 3.0.3 válido', () => {
    const doc = buildOpenApiDocument();

    assert.equal(doc.openapi, '3.0.3');
    assert.equal(doc.info.title, 'Scienpay API');
    assert.ok(doc.paths, 'El documento debe contener la clave paths');
    assert.ok(doc.components?.securitySchemes?.bearerAuth, 'Debe incluir bearerAuth');
    assert.ok(doc.components?.securitySchemes?.cookieAuth, 'Debe incluir cookieAuth');

    // Cada ruta de OPENAPI_ROUTES debe figurar en paths
    for (const route of OPENAPI_ROUTES) {
      const pathItem = doc.paths[route.path] as Record<string, unknown> | undefined;
      assert.ok(pathItem, `Path ${route.path} no encontrado en doc.paths`);
      assert.ok(
        pathItem[route.method],
        `Método ${route.method} no encontrado en doc.paths[${route.path}]`,
      );
    }
  });
});
