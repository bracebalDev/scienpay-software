export interface AccountSecurityState {
  failedAttempts: number;
  isLocked: boolean;
  lockoutExpiresAt: number | null;
  permanentLock: boolean;
}

/**
 * Política de Seguridad de Cuentas y Anti-Fuerza Bruta.
 * Define la regla de negocio:
 * - 1 y 2 intentos fallidos: conteo progresivo.
 * - 3 intentos fallidos: bloqueo temporal de 5 minutos (300.000 ms).
 * - 4 intentos fallidos: bloqueo definitivo permanente de la cuenta (solo ADMIN puede desbloquear).
 */
export class AccountSecurityPolicy {
  public static readonly LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos exactos
  public static readonly TEMP_LOCK_THRESHOLD = 3;
  public static readonly PERM_LOCK_THRESHOLD = 4;

  public static getInitialState(): AccountSecurityState {
    return {
      failedAttempts: 0,
      isLocked: false,
      lockoutExpiresAt: null,
      permanentLock: false,
    };
  }

  public static recordFailedAttempt(
    currentState: AccountSecurityState,
    currentTimeMs: number = Date.now(),
  ): AccountSecurityState {
    const nextAttempts = currentState.failedAttempts + 1;

    if (nextAttempts >= this.PERM_LOCK_THRESHOLD) {
      return {
        failedAttempts: nextAttempts,
        isLocked: true,
        lockoutExpiresAt: null,
        permanentLock: true,
      };
    }

    if (nextAttempts >= this.TEMP_LOCK_THRESHOLD) {
      return {
        failedAttempts: nextAttempts,
        isLocked: true,
        lockoutExpiresAt: currentTimeMs + this.LOCKOUT_DURATION_MS,
        permanentLock: false,
      };
    }

    return {
      ...currentState,
      failedAttempts: nextAttempts,
    };
  }

  public static recordSuccessfulAttempt(currentState: AccountSecurityState): AccountSecurityState {
    if (currentState.permanentLock) {
      throw new Error(
        'USUARIO_BLOQUEADO_PERMANENTE: La cuenta está bloqueada por seguridad. Contacte al Administrador.',
      );
    }

    return {
      failedAttempts: 0,
      isLocked: false,
      lockoutExpiresAt: null,
      permanentLock: false,
    };
  }

  public static adminUnlockUser(_currentState: AccountSecurityState): AccountSecurityState {
    return {
      failedAttempts: 0,
      isLocked: false,
      lockoutExpiresAt: null,
      permanentLock: false,
    };
  }
}
