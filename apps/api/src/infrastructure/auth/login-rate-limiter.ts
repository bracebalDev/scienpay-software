import { HttpException, HttpStatus } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter en memoria para el endpoint de login.
 * Límite por defecto: 5 solicitudes por minuto por clave (IP).
 *
 * Decisión documentada en HANDOFF 1.3: se implementa en memoria para no
 * introducir dependencias adicionales. Es suficiente para una instancia única;
 * si el despliegue escala horizontalmente, deberá sustituirse por un almacén
 * compartido (Redis) sin cambiar el contrato del controlador.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number = 60_000,
    private readonly maxAttempts: number = 5,
  ) {}

  public check(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    if (current.count >= this.maxAttempts) {
      const remainingSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      throw new HttpException(
        `DEMASIADAS_SOLICITUDES: Se excedió el límite de ${this.maxAttempts} intentos de login por minuto. Reintente en ${remainingSeconds} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }

  public reset(key?: string): void {
    if (key) {
      this.attempts.delete(key);
      return;
    }
    this.attempts.clear();
  }
}
