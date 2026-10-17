import { UserRole, ProjectArea, ProjectScope, ProjectStatus, PaymentRequestStatus } from '@scienpay/shared';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  title: string;
  failedAttempts: number;
  isLocked: boolean;
  lockoutExpiresAt: number | null; // Timestamp en ms si está temporalmente bloqueado (3 intentos = 5 min)
  permanentLock: boolean;          // Bloqueo definitivo tras 4to intento
}

export interface ProjectItem {
  id: string;
  code: string;
  name: string;
  area: ProjectArea;
  scope: ProjectScope;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budgetUSD: number;
}

export interface BeneficiaryItem {
  id: string;
  documentType: string;
  documentNumber: string;
  fullName: string;
  specialty: string;
  email: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface AssignmentItem {
  id: string;
  beneficiaryName: string;
  projectCode: string;
  periodicity: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
  amountUSD: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVO' | 'INACTIVO';
}

export interface PaymentRequestItem {
  id: string;
  requestCode: string;
  projectCode: string;
  period: string;
  totalAmountUSD: number;
  status: PaymentRequestStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  rejectionReason?: string;
  allocationsCount: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  entity: string;
  details: string;
  status: 'EXITO' | 'FALLO';
}
