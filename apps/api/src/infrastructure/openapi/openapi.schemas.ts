import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Idempotente: habilita `.openapi()` aunque este módulo se importe solo (tests).
extendZodWithOpenApi(z);

/**
 * Esquemas de respuesta para el documento OpenAPI (HANDOFF 4.5).
 *
 * Los schemas de entrada NO se duplican: se importan de `@scienpay/shared`.
 * Aquí solo viven los componentes de respuesta y las extensiones que el
 * contrato compartido no necesita para validar.
 */

export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD');
export const moneySchema = z
  .string()
  .regex(/^-?\d+(\.\d{2})?$/, 'Monto decimal serializado como string');

export const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
  details: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        code: z.string(),
      }),
    )
    .optional(),
});

export const messageResponseSchema = z.object({ message: z.string() });

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
});

export const userSchema = z
  .object({
    id: uuidSchema,
    username: z.string(),
    email: z.string(),
    fullName: z.string(),
    title: z.string().nullable().optional(),
    role: z.string(),
    failedAttempts: z.number().int().optional(),
    isLocked: z.boolean().optional(),
    permanentLock: z.boolean().optional(),
  })
  .passthrough();

export const loginResponseSchema = z.object({
  message: z.string(),
  accessToken: z.string(),
  user: userSchema,
});

export const refreshResponseSchema = z.object({
  message: z.string(),
  accessToken: z.string(),
});

export const projectSchema = z
  .object({
    id: uuidSchema,
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
    area: z.string(),
    scope: z.string(),
    status: z.string(),
    startDate: dateSchema,
    endDate: dateSchema.nullable().optional(),
    budgetUSD: moneySchema.optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const personSchema = z
  .object({
    id: uuidSchema,
    documentType: z.string(),
    documentNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    specialty: z.string().optional(),
    status: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const paymentGroupSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    periodicity: z.string(),
    cutOffConfig: z.record(z.unknown()).optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const assignmentSchema = z
  .object({
    id: uuidSchema,
    personId: uuidSchema,
    projectId: uuidSchema,
    paymentGroupId: uuidSchema,
    amountPerPeriod: moneySchema,
    currency: z.string(),
    startDate: dateSchema,
    endDate: dateSchema.nullable().optional(),
    status: z.string(),
    notes: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const causationItemSchema = z
  .object({
    id: uuidSchema,
    batchId: uuidSchema,
    personId: uuidSchema,
    assignmentId: uuidSchema,
    periodStartDate: dateSchema,
    periodEndDate: dateSchema,
    totalDaysInPeriod: z.number().int(),
    activeDays: z.number().int(),
    baseAmount: moneySchema,
    calculatedAmount: moneySchema,
    paidAmount: moneySchema,
    remainingDebt: moneySchema,
    status: z.string(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const causationBatchSchema = z
  .object({
    id: uuidSchema,
    projectId: uuidSchema,
    paymentGroupId: uuidSchema,
    periodStartDate: dateSchema,
    periodEndDate: dateSchema,
    totalCausationAmount: moneySchema,
    status: z.string(),
    calculatedByUserId: uuidSchema.nullable().optional(),
    annulmentReason: z.string().nullable().optional(),
    annulledByUserId: uuidSchema.nullable().optional(),
    annulledAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const causationBatchDetailSchema = causationBatchSchema.extend({
  items: z.array(causationItemSchema),
});

export const causationPreviewItemSchema = z.object({
  assignmentId: uuidSchema,
  personId: uuidSchema,
  beneficiaryName: z.string(),
  beneficiaryDocument: z.string(),
  totalDaysInPeriod: z.number().int(),
  activeDays: z.number().int(),
  baseAmount: moneySchema,
  calculatedAmount: moneySchema,
});

export const causationPreviewSchema = z.object({
  projectId: uuidSchema,
  paymentGroupId: uuidSchema,
  periodStartDate: dateSchema,
  periodEndDate: dateSchema,
  itemsCount: z.number().int(),
  totalCausationAmount: moneySchema,
  items: z.array(causationPreviewItemSchema),
});

export const causationBatchResultSchema = z.object({
  message: z.string(),
  batch: causationBatchSchema,
  itemsCount: z.number().int(),
});

export const paymentRequestSchema = z
  .object({
    id: uuidSchema,
    requestCode: z.string(),
    projectId: uuidSchema,
    causationBatchId: uuidSchema,
    periodDescription: z.string(),
    totalAmountUSD: moneySchema,
    status: z.string(),
    createdByUserId: uuidSchema,
    reviewedByUserId: uuidSchema.nullable(),
    reviewedAt: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const disbursementSchema = z
  .object({
    id: uuidSchema,
    paymentRequestId: uuidSchema,
    disbursedByUserId: uuidSchema,
    paymentMethod: z.string(),
    referenceNumber: z.string().optional(),
    totalAmount: moneySchema,
    notes: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const receiptAllocationSchema = z
  .object({
    id: uuidSchema,
    receiptId: uuidSchema,
    causationItemId: uuidSchema,
    allocatedAmountUSD: moneySchema,
    debtBeforeAllocationUSD: moneySchema,
    debtAfterAllocationUSD: moneySchema,
    createdAt: z.string().optional(),
  })
  .passthrough();

export const receiptSchema = z
  .object({
    id: uuidSchema,
    receiptNumber: z.string(),
    disbursementId: uuidSchema,
    personId: uuidSchema,
    projectId: uuidSchema,
    totalAmountUSD: moneySchema,
    remainingDebtAfterUSD: moneySchema,
    issuedByUserId: uuidSchema.nullable().optional(),
    issuedAt: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const receiptDetailSchema = receiptSchema.extend({
  allocations: z.array(receiptAllocationSchema),
});

export const disbursementResultSchema = z.object({
  message: z.string(),
  disbursement: disbursementSchema,
  receipts: z.array(receiptSchema),
});

export const pettyCashSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    description: z.string().optional(),
    custodianName: z.string(),
    status: z.string(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const pettyCashPeriodSchema = z
  .object({
    id: uuidSchema,
    pettyCashId: uuidSchema,
    periodYear: z.number().int(),
    periodMonth: z.number().int(),
    openingBalance: moneySchema,
    disbursedTotal: moneySchema,
    renderedTotal: moneySchema,
    closingBalance: moneySchema,
    status: z.string(),
    openedByUserId: uuidSchema.nullable().optional(),
    closedByUserId: uuidSchema.nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const pettyCashVoucherSchema = z
  .object({
    id: uuidSchema,
    voucherNumber: z.string(),
    pettyCashPeriodId: uuidSchema,
    projectId: uuidSchema,
    requestedAmount: moneySchema,
    renderedAmount: moneySchema,
    changeAmount: moneySchema,
    purpose: z.string(),
    invoiceReference: z.string().optional(),
    status: z.string(),
    requestedBy: z.string(),
    approvedByUserId: uuidSchema.nullable().optional(),
    disbursedByUserId: uuidSchema.nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const auditLogSchema = z
  .object({
    id: uuidSchema,
    userId: uuidSchema.nullable(),
    userEmail: z.string(),
    userRole: z.string(),
    action: z.string(),
    entity: z.string(),
    entityId: z.string(),
    oldValues: z.record(z.unknown()).nullable(),
    newValues: z.record(z.unknown()).nullable(),
    ipAddress: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

export const auditPageSchema = z.object({
  data: z.array(auditLogSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

export const pdfSchema = z.string().openapi({
  format: 'binary',
  description: 'Documento PDF generado por el servidor',
});
