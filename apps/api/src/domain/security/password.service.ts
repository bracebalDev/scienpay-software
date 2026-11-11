import * as argon2 from 'argon2';

/**
 * Servicio de Hashing de Contraseñas con Argon2id.
 * Satisface ADR-006 y las directrices de OWASP ASVS Nivel 2.
 */
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iteraciones
    parallelism: 4, // 4 hilos paralelos
  };

  /**
   * Hashea una contraseña en texto plano utilizando Argon2id.
   */
  async hash(plainPassword: string): Promise<string> {
    if (!plainPassword || plainPassword.length < 8) {
      throw new Error(
        'PASSWORD_INVALIDA: La contraseña no cumple con la longitud mínima requerida',
      );
    }
    return argon2.hash(plainPassword, this.options);
  }

  /**
   * Verifica una contraseña en texto plano contra un hash Argon2id almacenado.
   */
  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false;
    }
  }
}
