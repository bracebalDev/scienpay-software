import { UserRole } from '@scienpay/shared';

export enum DomainAction {
  // Acciones exclusivas del Administrador
  MANAGE_USERS = 'MANAGE_USERS',
  CONFIGURE_PARAMETERS = 'CONFIGURE_PARAMETERS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // Acciones exclusivas del Generador (Coordinador)
  MANAGE_PROJECTS = 'MANAGE_PROJECTS',
  MANAGE_BENEFICIARIES = 'MANAGE_BENEFICIARIES',
  MANAGE_ASSIGNMENTS = 'MANAGE_ASSIGNMENTS',
  GENERATE_CAUSATION = 'GENERATE_CAUSATION',
  CREATE_PAYMENT_REQUEST = 'CREATE_PAYMENT_REQUEST',

  // Acciones exclusivas del Receptor (Gerente de Finanzas)
  APPROVE_PAYMENT_REQUEST = 'APPROVE_PAYMENT_REQUEST',
  REJECT_PAYMENT_REQUEST = 'REJECT_PAYMENT_REQUEST',
  REGISTER_DISBURSEMENT = 'REGISTER_DISBURSEMENT',
  MANAGE_PETTY_CASH = 'MANAGE_PETTY_CASH',
}

/**
 * Matriz estricta de Segregación de Funciones (RBAC en Backend).
 * Implementa la especificación de referencia:
 * - ADMIN: solo gestión y parámetros, NO opera dinero.
 * - GENERADOR: proyectos, personas, asignaciones, causación y solicitudes. NO aprueba ni desembolsa.
 * - RECEPTOR: aprueba, rechaza y desembolsa fondos, opera cajas chicas. NO crea proyectos ni causaciones.
 */
export class RolePermissionsPolicy {
  private static readonly PERMISSIONS_MAP: Record<UserRole, ReadonlySet<DomainAction>> = {
    [UserRole.ADMIN]: new Set([
      DomainAction.MANAGE_USERS,
      DomainAction.CONFIGURE_PARAMETERS,
      DomainAction.VIEW_AUDIT_LOGS,
    ]),

    [UserRole.GENERADOR]: new Set([
      DomainAction.MANAGE_PROJECTS,
      DomainAction.MANAGE_BENEFICIARIES,
      DomainAction.MANAGE_ASSIGNMENTS,
      DomainAction.GENERATE_CAUSATION,
      DomainAction.CREATE_PAYMENT_REQUEST,
    ]),

    [UserRole.RECEPTOR]: new Set([
      DomainAction.APPROVE_PAYMENT_REQUEST,
      DomainAction.REJECT_PAYMENT_REQUEST,
      DomainAction.REGISTER_DISBURSEMENT,
      DomainAction.MANAGE_PETTY_CASH,
    ]),
  };

  public static canPerform(role: UserRole, action: DomainAction): boolean {
    const rolePermissions = this.PERMISSIONS_MAP[role];
    if (!rolePermissions) {
      return false;
    }
    return rolePermissions.has(action);
  }

  /**
   * Regla de Cuatro Ojos: El generador de una solicitud NO puede ser su propio aprobador.
   * Valida simultáneamente que el revisor tenga el rol RECEPTOR y sea un usuario distinto.
   */
  public static canApproveRequest(
    creatorUserId: string,
    reviewerUserId: string,
    reviewerRole: UserRole,
  ): boolean {
    if (reviewerRole !== UserRole.RECEPTOR) {
      return false;
    }
    if (!creatorUserId || !reviewerUserId) {
      return false;
    }
    return creatorUserId !== reviewerUserId;
  }
}
