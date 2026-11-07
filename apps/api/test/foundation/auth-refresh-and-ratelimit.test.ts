import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole, loginSchema } from '@scienpay/shared';
import { AuthService } from '../../src/infrastructure/auth/auth.service.js';
import { PasswordService } from '../../src/domain/security/password.service.js';
import { LoginRateLimiter } from '../../src/infrastructure/auth/login-rate-limiter.js';

describe('Autenticación: identificador, rotación de refresh y rate limiting', () => {
  const passwordService = new PasswordService();
  const authService = new AuthService(
    passwordService,
    'test_jwt_secret_minimum_64_characters_super_secure_key_1234567890',
    'test_refresh_jwt_secret_minimum_64_characters_super_secure_key_12345',
  );

  it('debe aceptar usuario o correo electrónico en el campo identifier', () => {
    const byUsername = loginSchema.safeParse({
      identifier: 'admin',
      password: 'PasswordSegura123!',
    });
    const byEmail = loginSchema.safeParse({
      identifier: 'admin@scienpay.uc.edu.ve',
      password: 'PasswordSegura123!',
    });

    assert.equal(byUsername.success, true);
    assert.equal(byEmail.success, true);
  });

  it('debe rechazar un login sin identifier o con contraseña corta', () => {
    const withoutIdentifier = loginSchema.safeParse({ password: 'PasswordSegura123!' });
    const shortPassword = loginSchema.safeParse({ identifier: 'admin', password: 'corta' });

    assert.equal(withoutIdentifier.success, false);
    assert.equal(shortPassword.success, false);
  });

  it('debe conservar la familia al rotar el refresh token y emitir un token distinto', () => {
    const payload = {
      id: 'usr-admin-01',
      email: 'admin@scienpay.uc.edu.ve',
      fullName: 'Carlos Mendoza',
      role: UserRole.ADMIN,
    };

    const first = authService.generateRefreshToken(payload);
    const second = authService.generateRefreshToken(payload, first.familyId);

    assert.equal(second.familyId, first.familyId);
    assert.notEqual(second.refreshToken, first.refreshToken);

    const claims = authService.verifyRefreshToken(second.refreshToken);
    assert.equal(claims.familyId, first.familyId);
    assert.equal(claims.id, payload.id);
  });

  it('debe limitar el login a 5 intentos por ventana y permitir reinicio explícito', () => {
    const limiter = new LoginRateLimiter(60_000, 5);

    for (let i = 0; i < 5; i += 1) {
      assert.doesNotThrow(() => limiter.check('127.0.0.1'));
    }

    assert.throws(
      () => limiter.check('127.0.0.1'),
      (error: any) => error?.status === 429,
      'El sexto intento debe responder HTTP 429',
    );

    // Otra IP conserva su propia ventana.
    assert.doesNotThrow(() => limiter.check('127.0.0.2'));

    limiter.reset('127.0.0.1');
    assert.doesNotThrow(() => limiter.check('127.0.0.1'));
  });
});
