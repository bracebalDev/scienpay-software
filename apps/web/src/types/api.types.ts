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
} from '@scienpay/shared';

/** Usuario autenticado devuelto por /auth/login y /auth/me. */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  title: string;
  role: UserRole;
  failedAttempts?: number;
  isLocked?: boolean;
  permanentLock?: boolean;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  user: Omit<AuthUser, 'failedAttempts' | 'isLocked' | 'permanentLock'>;
}

export interface RefreshResponse {
  message: string;
  accessToken: string;
}

export interface UserAccount extends AuthUser {
  failedAttempts: number;
  isLocked: boolean;
  lockoutExpiresAt: string | null;
  permanentLock: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  area: ProjectArea;
  scope: ProjectScope;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  budgetUSD: string;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialty: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGroup {
  id: string;
  name: string;
  periodicity: Periodicity;
  cutOffConfig: Record<string, unknown>;
  description: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  personId: string;
  projectId: string;
  paymentGroupId: string;
  amountPerPeriod: string;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: AssignmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CausationBatch {
  id: string;
  projectId: string;
  paymentGroupId: string;
  periodStartDate: string;
  periodEndDate: string;
  totalCausationAmount: string;
  status: CausationBatchStatus;
  calculatedByUserId: string;
  annulmentReason: string | null;
  annulledByUserId: string | null;
  annulledAt: string | null;
  createdAt: string;
}

export interface CausationItem {
  id: string;
  batchId: string;
  personId: string;
  assignmentId: string;
  periodStartDate: string;
  periodEndDate: string;
  totalDaysInPeriod: number;
  activeDays: number;
  baseAmount: string;
  calculatedAmount: string;
  paidAmount: string;
  remainingDebt: string;
  status: CausationItemStatus;
  createdAt: string;
}

export interface CausationBatchDetail extends CausationBatch {
  items: CausationItem[];
}

export interface CausationPreviewItem {
  assignmentId: string;
  personId: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  totalDaysInPeriod: number;
  activeDays: number;
  baseAmount: string;
  calculatedAmount: string;
}

export interface CausationPreview {
  projectId: string;
  paymentGroupId: string;
  periodStartDate: string;
  periodEndDate: string;
  itemsCount: number;
  totalCausationAmount: string;
  items: CausationPreviewItem[];
}

export interface PaymentRequest {
  id: string;
  requestCode: string;
  projectId: string;
  causationBatchId: string;
  periodDescription: string;
  totalAmountUSD: string;
  status: PaymentRequestStatus;
  createdByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Disbursement {
  id: string;
  paymentRequestId: string;
  disbursedByUserId: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  totalAmount: string;
  notes: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  disbursementId: string;
  personId: string;
  projectId: string;
  totalAmountUSD: string;
  remainingDebtAfterUSD: string;
  issuedByUserId: string;
  issuedAt: string;
  notes: string;
}

export interface PettyCash {
  id: string;
  name: string;
  description: string;
  custodianName: string;
  status: PettyCashStatus;
  createdAt: string;
}

export interface PettyCashPeriod {
  id: string;
  pettyCashId: string;
  periodYear: number;
  periodMonth: number;
  openingBalance: string;
  disbursedTotal: string;
  renderedTotal: string;
  closingBalance: string;
  status: PettyCashPeriodStatus;
  openedByUserId: string;
  closedByUserId: string | null;
  createdAt: string;
}

export interface PettyCashVoucher {
  id: string;
  voucherNumber: string;
  pettyCashPeriodId: string;
  projectId: string;
  requestedAmount: string;
  renderedAmount: string;
  changeAmount: string;
  purpose: string;
  invoiceReference: string;
  status: PettyCashVoucherStatus;
  requestedBy: string;
  approvedByUserId: string | null;
  disbursedByUserId: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditFilters {
  userId?: string;
  entity?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface RegisterDisbursementResponse {
  message: string;
  disbursement: Disbursement;
  receipts: Receipt[];
}
