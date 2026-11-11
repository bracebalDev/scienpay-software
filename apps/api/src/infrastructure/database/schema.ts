import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  UserRole,
  ProjectArea,
  ProjectScope,
  ProjectStatus,
  Periodicity,
  AssignmentStatus,
  CausationBatchStatus,
  CausationItemStatus,
  PaymentRequestStatus,
  PaymentMethod,
  PettyCashStatus,
  PettyCashPeriodStatus,
  PettyCashVoucherStatus,
  PettyCashMovementType,
} from '@scienpay/shared';

// 1. Usuarios del Sistema (ADMIN, GENERADOR, RECEPTOR)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 120 }).notNull().unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  title: varchar('title', { length: 150 }).default(''),
  role: varchar('role', { length: 20 }).notNull().$type<UserRole>(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  lockoutExpiresAt: timestamp('lockout_expires_at', { withTimezone: true }),
  permanentLock: boolean('permanent_lock').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Refresh Tokens Rotativos
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  familyId: uuid('family_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Proyectos de Investigación Científica (Física, Química, Biología)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description').default(''),
  area: varchar('area', { length: 20 }).notNull().$type<ProjectArea>(),
  scope: varchar('scope', { length: 20 }).notNull().$type<ProjectScope>(),
  status: varchar('status', { length: 20 })
    .default(ProjectStatus.ACTIVO)
    .notNull()
    .$type<ProjectStatus>(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  budgetUSD: numeric('budget_usd', { precision: 14, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Grupos de Pago (Periodicidad y Fechas de Corte)
export const paymentGroups = pgTable('payment_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  periodicity: varchar('periodicity', { length: 20 }).notNull().$type<Periodicity>(),
  cutOffConfig: jsonb('cut_off_config').default({}).notNull(),
  description: text('description').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Personas Beneficiarias (El personal que cobra; NO tienen usuario en el sistema)
export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentType: varchar('document_type', { length: 10 }).default('V').notNull(),
    documentNumber: varchar('document_number', { length: 30 }).notNull(),
    firstName: varchar('first_name', { length: 80 }).notNull(),
    lastName: varchar('last_name', { length: 80 }).notNull(),
    email: varchar('email', { length: 120 }),
    phone: varchar('phone', { length: 30 }),
    specialty: varchar('specialty', { length: 150 }).default(''),
    status: varchar('status', { length: 20 }).default('ACTIVO').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPersonDocUnique: uniqueIndex('idx_person_doc_unique').on(
      table.documentType,
      table.documentNumber,
    ),
  }),
);

// 6. Asignaciones (Persona + Proyecto + Grupo de Pago)
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id')
    .references(() => persons.id, { onDelete: 'restrict' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'restrict' })
    .notNull(),
  paymentGroupId: uuid('payment_group_id')
    .references(() => paymentGroups.id, { onDelete: 'restrict' })
    .notNull(),
  amountPerPeriod: numeric('amount_per_period', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: varchar('status', { length: 20 })
    .default(AssignmentStatus.ACTIVO)
    .notNull()
    .$type<AssignmentStatus>(),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Lotes de Causación (INMUTABLE)
export const causationBatches = pgTable(
  'causation_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'restrict' })
      .notNull(),
    paymentGroupId: uuid('payment_group_id')
      .references(() => paymentGroups.id, { onDelete: 'restrict' })
      .notNull(),
    periodStartDate: date('period_start_date').notNull(),
    periodEndDate: date('period_end_date').notNull(),
    totalCausationAmount: numeric('total_causation_amount', { precision: 14, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 })
      .default(CausationBatchStatus.CALCULADO)
      .notNull()
      .$type<CausationBatchStatus>(),
    calculatedByUserId: uuid('calculated_by_user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    annulmentReason: text('annulment_reason'),
    annulledByUserId: uuid('annulled_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    annulledAt: timestamp('annulled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxCausationBatchIdempotence: uniqueIndex('idx_causation_batch_idempotence').on(
      table.projectId,
      table.paymentGroupId,
      table.periodStartDate,
      table.periodEndDate,
    ),
  }),
);

// 8. Ítems de Causación (INMUTABLE)
export const causationItems = pgTable('causation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id')
    .references(() => causationBatches.id, { onDelete: 'restrict' })
    .notNull(),
  personId: uuid('person_id')
    .references(() => persons.id, { onDelete: 'restrict' })
    .notNull(),
  assignmentId: uuid('assignment_id')
    .references(() => assignments.id, { onDelete: 'restrict' })
    .notNull(),
  periodStartDate: date('period_start_date').notNull(),
  periodEndDate: date('period_end_date').notNull(),
  totalDaysInPeriod: integer('total_days_in_period').notNull(),
  activeDays: integer('active_days').notNull(),
  baseAmount: numeric('base_amount', { precision: 14, scale: 2 }).notNull(),
  calculatedAmount: numeric('calculated_amount', { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  remainingDebt: numeric('remaining_debt', { precision: 14, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 })
    .default(CausationItemStatus.PENDIENTE)
    .notNull()
    .$type<CausationItemStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Solicitudes de Pago (INMUTABLE)
export const paymentRequests = pgTable(
  'payment_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestCode: varchar('request_code', { length: 30 }).notNull().unique(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'restrict' })
      .notNull(),
    causationBatchId: uuid('causation_batch_id')
      .references(() => causationBatches.id, { onDelete: 'restrict' })
      .notNull(),
    periodDescription: varchar('period_description', { length: 150 }).notNull(),
    totalAmountUSD: numeric('total_amount_usd', { precision: 14, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 })
      .default(PaymentRequestStatus.BORRADOR)
      .notNull()
      .$type<PaymentRequestStatus>(),
    createdByUserId: uuid('created_by_user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    chkFourEyesApproval: check(
      'chk_four_eyes_approval',
      sql`${table.reviewedByUserId} IS NULL OR ${table.createdByUserId} <> ${table.reviewedByUserId}`,
    ),
  }),
);

// 10. Desembolsos (Entrega de Fondos - INMUTABLE)
export const disbursements = pgTable('disbursements', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentRequestId: uuid('payment_request_id')
    .references(() => paymentRequests.id, { onDelete: 'restrict' })
    .notNull(),
  disbursedByUserId: uuid('disbursed_by_user_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().$type<PaymentMethod>(),
  referenceNumber: varchar('reference_number', { length: 100 }).default(''),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Recibos Individuales Inmutables
export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  receiptNumber: varchar('receipt_number', { length: 30 }).notNull().unique(),
  disbursementId: uuid('disbursement_id')
    .references(() => disbursements.id, { onDelete: 'restrict' })
    .notNull(),
  personId: uuid('person_id')
    .references(() => persons.id, { onDelete: 'restrict' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'restrict' })
    .notNull(),
  totalAmountUSD: numeric('total_amount_usd', { precision: 14, scale: 2 }).notNull(),
  remainingDebtAfterUSD: numeric('remaining_debt_after_usd', { precision: 14, scale: 2 }).notNull(),
  issuedByUserId: uuid('issued_by_user_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes').default(''),
});

// 12. Imputaciones de Recibo FIFO (INMUTABLE)
export const receiptAllocations = pgTable('receipt_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  receiptId: uuid('receipt_id')
    .references(() => receipts.id, { onDelete: 'restrict' })
    .notNull(),
  causationItemId: uuid('causation_item_id')
    .references(() => causationItems.id, { onDelete: 'restrict' })
    .notNull(),
  allocatedAmountUSD: numeric('allocated_amount_usd', { precision: 14, scale: 2 }).notNull(),
  debtBeforeAllocationUSD: numeric('debt_before_allocation_usd', {
    precision: 14,
    scale: 2,
  }).notNull(),
  debtAfterAllocationUSD: numeric('debt_after_allocation_usd', {
    precision: 14,
    scale: 2,
  }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Cajas Chicas
export const pettyCash = pgTable('petty_cash', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').default(''),
  custodianName: varchar('custodian_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 })
    .default(PettyCashStatus.ACTIVA)
    .notNull()
    .$type<PettyCashStatus>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Proyectos asignados a Caja Chica
export const pettyCashProjects = pgTable('petty_cash_projects', {
  pettyCashId: uuid('petty_cash_id')
    .references(() => pettyCash.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
});

// 15. Períodos Mensuales de Caja Chica
export const pettyCashPeriods = pgTable(
  'petty_cash_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pettyCashId: uuid('petty_cash_id')
      .references(() => pettyCash.id, { onDelete: 'restrict' })
      .notNull(),
    periodYear: integer('period_year').notNull(),
    periodMonth: integer('period_month').notNull(),
    openingBalance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull(),
    disbursedTotal: numeric('disbursed_total', { precision: 14, scale: 2 })
      .default('0.00')
      .notNull(),
    renderedTotal: numeric('rendered_total', { precision: 14, scale: 2 }).default('0.00').notNull(),
    closingBalance: numeric('closing_balance', { precision: 14, scale: 2 })
      .default('0.00')
      .notNull(),
    status: varchar('status', { length: 20 })
      .default(PettyCashPeriodStatus.ABIERTO)
      .notNull()
      .$type<PettyCashPeriodStatus>(),
    openedByUserId: uuid('opened_by_user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    closedByUserId: uuid('closed_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPettyCashPeriodUnique: uniqueIndex('idx_petty_cash_period_unique').on(
      table.pettyCashId,
      table.periodYear,
      table.periodMonth,
    ),
  }),
);

// 16. Vales de Caja Chica
export const pettyCashVouchers = pgTable('petty_cash_vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  voucherNumber: varchar('voucher_number', { length: 30 }).notNull().unique(),
  pettyCashPeriodId: uuid('petty_cash_period_id')
    .references(() => pettyCashPeriods.id, { onDelete: 'restrict' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'restrict' })
    .notNull(),
  requestedAmount: numeric('requested_amount', { precision: 14, scale: 2 }).notNull(),
  renderedAmount: numeric('rendered_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  changeAmount: numeric('change_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  purpose: text('purpose').notNull(),
  invoiceReference: varchar('invoice_reference', { length: 100 }).default(''),
  status: varchar('status', { length: 20 })
    .default(PettyCashVoucherStatus.SOLICITADO)
    .notNull()
    .$type<PettyCashVoucherStatus>(),
  requestedBy: varchar('requested_by', { length: 100 }).notNull(),
  approvedByUserId: uuid('approved_by_user_id').references(() => users.id, {
    onDelete: 'restrict',
  }),
  disbursedByUserId: uuid('disbursed_by_user_id').references(() => users.id, {
    onDelete: 'restrict',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 17. Movimientos de Caja Chica (INMUTABLE)
export const pettyCashMovements = pgTable('petty_cash_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  pettyCashPeriodId: uuid('petty_cash_period_id')
    .references(() => pettyCashPeriods.id, { onDelete: 'restrict' })
    .notNull(),
  voucherId: uuid('voucher_id').references(() => pettyCashVouchers.id, { onDelete: 'restrict' }),
  movementType: varchar('movement_type', { length: 30 }).notNull().$type<PettyCashMovementType>(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  previousBalance: numeric('previous_balance', { precision: 14, scale: 2 }).notNull(),
  newBalance: numeric('new_balance', { precision: 14, scale: 2 }).notNull(),
  performedByUserId: uuid('performed_by_user_id')
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 18. Registro de Auditoría (audit_log - INMUTABLE)
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
  userEmail: varchar('user_email', { length: 120 }).default(''),
  userRole: varchar('user_role', { length: 50 }).default(''),
  action: varchar('action', { length: 80 }).notNull(),
  entity: varchar('entity', { length: 80 }).notNull(),
  entityId: varchar('entity_id', { length: 80 }).default(''),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 50 }).default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 19. Secuencias Transaccionales Correlativas
export const requestSequences = pgTable('request_sequences', {
  year: integer('year').primaryKey(),
  lastNumber: bigint('last_number', { mode: 'number' }).default(0).notNull(),
});

export const receiptSequences = pgTable('receipt_sequences', {
  year: integer('year').primaryKey(),
  lastNumber: bigint('last_number', { mode: 'number' }).default(0).notNull(),
});

export const voucherSequences = pgTable('voucher_sequences', {
  year: integer('year').primaryKey(),
  lastNumber: bigint('last_number', { mode: 'number' }).default(0).notNull(),
});
