import { z } from 'zod';
import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type {
  RouteConfig,
  ZodMediaTypeObject,
  ResponseConfig,
} from '@asteasolutions/zod-to-openapi';
import {
  annulCausationBatchSchema,
  auditQuerySchema,
  createAssignmentSchema,
  createPaymentGroupSchema,
  createPaymentRequestSchema,
  createPersonSchema,
  createPettyCashSchema,
  createProjectSchema,
  createUserSchema,
  generateCausationBatchSchema,
  loginSchema,
  openPettyCashPeriodSchema,
  previewCausationSchema,
  registerDisbursementSchema,
  rejectPaymentRequestSchema,
  renderPettyCashVoucherSchema,
  requestPettyCashVoucherSchema,
  terminateAssignmentSchema,
  updatePersonSchema,
  updateProjectSchema,
} from '@scienpay/shared';
import { OPENAPI_ROUTES, OPENAPI_TAGS } from './openapi.routes.js';
import * as responses from './openapi.schemas.js';

/**
 * Genera el documento OpenAPI 3 a partir de:
 *
 *   1. Los schemas Zod de `@scienpay/shared` (única fuente de validación).
 *   2. El registro explícito de rutas (`openapi.routes.ts`).
 *   3. Los esquemas de respuesta de `openapi.schemas.ts`.
 *
 * No se usan DTOs duplicados ni decoradores `@ApiProperty`.
 */

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Datos inválidos (validación Zod)',
  401: 'No autenticado o sesión inválida',
  403: 'Prohibido por RBAC',
  404: 'Recurso no encontrado',
  409: 'Conflicto con una regla de negocio',
  429: 'Demasiados intentos de login',
};

function jsonContent(schema: z.ZodTypeAny): Record<string, ZodMediaTypeObject> {
  return { 'application/json': { schema } };
}

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token JWT emitido por `POST /auth/login` (vida: 15 minutos).',
  });

  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'scienpay_refresh',
    description: 'Cookie HttpOnly de refresh rotativa (vida: 7 días, path `/api/v1/auth`).',
  });

  /**
   * Registra cada schema una sola vez y devuelve el ejemplar con `refId`,
   * de modo que el documento referencie componentes en lugar de duplicarlos.
   */
  const bySchema = new Map<z.ZodTypeAny, z.ZodTypeAny>();
  const register = <T extends z.ZodTypeAny>(name: string, schema: T): T => {
    const registered = registry.register(name, schema) as T;
    bySchema.set(schema, registered);
    return registered;
  };
  const resolve = (schema: z.ZodTypeAny): z.ZodTypeAny => bySchema.get(schema) ?? schema;
  const resolveResponse = (schema: z.ZodTypeAny): z.ZodTypeAny => {
    if (schema instanceof z.ZodArray) {
      return z.array(resolve(schema.element as z.ZodTypeAny));
    }
    return resolve(schema);
  };

  // Componentes de error y mensajes
  register('ErrorResponse', responses.errorResponseSchema);
  register('MessageResponse', responses.messageResponseSchema);
  register('HealthResponse', responses.healthResponseSchema);
  register('PdfDocument', responses.pdfSchema);

  // Autenticación y usuarios
  register('LoginRequest', loginSchema);
  register('LoginResponse', responses.loginResponseSchema);
  register('RefreshResponse', responses.refreshResponseSchema);
  register('User', responses.userSchema);
  register('CreateUserRequest', createUserSchema);

  // Catálogos
  register('Project', responses.projectSchema);
  register('CreateProjectRequest', createProjectSchema);
  register('UpdateProjectRequest', updateProjectSchema);
  register('Person', responses.personSchema);
  register('CreatePersonRequest', createPersonSchema);
  register('UpdatePersonRequest', updatePersonSchema);
  register('PaymentGroup', responses.paymentGroupSchema);
  register('CreatePaymentGroupRequest', createPaymentGroupSchema);
  register('Assignment', responses.assignmentSchema);
  register('CreateAssignmentRequest', createAssignmentSchema);
  register('TerminateAssignmentRequest', terminateAssignmentSchema);

  // Causación
  register('CausationItem', responses.causationItemSchema);
  register('CausationBatch', responses.causationBatchSchema);
  register('CausationBatchDetail', responses.causationBatchDetailSchema);
  register('CausationPreview', responses.causationPreviewSchema);
  register('CausationBatchResult', responses.causationBatchResultSchema);
  register('CausationPeriodRequest', previewCausationSchema);
  bySchema.set(generateCausationBatchSchema, bySchema.get(previewCausationSchema) as z.ZodTypeAny);
  register('AnnulCausationRequest', annulCausationBatchSchema);

  // Solicitudes y desembolsos
  register('PaymentRequest', responses.paymentRequestSchema);
  register('CreatePaymentRequestRequest', createPaymentRequestSchema);
  register('RejectPaymentRequestRequest', rejectPaymentRequestSchema);
  register('Disbursement', responses.disbursementSchema);
  register('DisbursementResult', responses.disbursementResultSchema);
  register('Receipt', responses.receiptSchema);
  register('ReceiptDetail', responses.receiptDetailSchema);
  register('ReceiptAllocation', responses.receiptAllocationSchema);
  register('RegisterDisbursementRequest', registerDisbursementSchema);

  // Caja chica
  register('PettyCash', responses.pettyCashSchema);
  register('CreatePettyCashRequest', createPettyCashSchema);
  register('PettyCashPeriod', responses.pettyCashPeriodSchema);
  register('OpenPettyCashPeriodRequest', openPettyCashPeriodSchema);
  register('PettyCashVoucher', responses.pettyCashVoucherSchema);
  register('RequestPettyCashVoucherRequest', requestPettyCashVoucherSchema);
  register('RenderPettyCashVoucherRequest', renderPettyCashVoucherSchema);

  // Auditoría y filtros
  register('AuditLog', responses.auditLogSchema);
  register('AuditPage', responses.auditPageSchema);
  register('AuditQuery', auditQuerySchema);
  register('ProjectFilterQuery', z.object({ projectId: z.string().uuid().optional() }));

  for (const route of OPENAPI_ROUTES) {
    const request: NonNullable<RouteConfig['request']> = {};

    if (route.params) request.params = route.params;
    if (route.query) {
      request.query = resolve(route.query) as NonNullable<RouteConfig['request']>['query'];
    }
    if (route.body) {
      request.body = {
        required: true,
        content: jsonContent(resolve(route.body)),
      };
    }

    const responsesConfig: Record<string, ResponseConfig> = {};
    const successStatus = route.successStatus ?? 200;
    if (route.success) {
      responsesConfig[successStatus] = {
        description: successStatus === 201 ? 'Recurso creado' : 'Operación exitosa',
        content:
          route.contentType === 'application/pdf'
            ? { 'application/pdf': { schema: resolve(route.success) } }
            : jsonContent(resolveResponse(route.success)),
      };
    }

    const protectedRoute = route.roles !== 'PUBLIC';
    const errorStatuses = new Set<number>(route.errors ?? []);
    if (protectedRoute) {
      errorStatuses.add(401);
      errorStatuses.add(403);
    }
    for (const status of [...errorStatuses].sort((a, b) => a - b)) {
      responsesConfig[status] = {
        description: ERROR_DESCRIPTIONS[status] ?? 'Error',
        content: jsonContent(resolve(responses.errorResponseSchema)),
      };
    }

    registry.registerPath({
      method: route.method,
      path: route.path,
      tags: [route.tag],
      operationId: route.operationId,
      summary: route.summary,
      request,
      responses: responsesConfig,
      security: protectedRoute
        ? [{ bearerAuth: [] }]
        : route.cookieAuth
          ? [{ cookieAuth: [] }]
          : [],
    });
  }

  const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Scienpay API',
      version: '1.0.0',
      description:
        'Contratos HTTP del sistema de gestión de pagos científicos. ' +
        'Los schemas de entrada se generan desde Zod (`@scienpay/shared`); ' +
        'este documento no duplica DTOs. Para endpoints protegidos use el ' +
        'botón Authorize con el access token de `POST /auth/login`.',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    tags: [...OPENAPI_TAGS],
  });

  // Extensión propia: expone los roles autorizados de cada operación.
  for (const route of OPENAPI_ROUTES) {
    const pathItem = document.paths[route.path] as Record<string, unknown> | undefined;
    const operation = pathItem?.[route.method] as Record<string, unknown> | undefined;
    if (operation) {
      operation['x-roles'] = route.roles === 'PUBLIC' ? ['PUBLIC'] : [...route.roles];
    }
  }

  return document;
}
