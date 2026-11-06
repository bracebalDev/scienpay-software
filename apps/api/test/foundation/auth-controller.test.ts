import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@scienpay/shared';
import { AuthService } from '../../src/infrastructure/auth/auth.service.js';
import { PasswordService } from '../../src/domain/security/password.service.js';

describe('Servicio de Autenticación y Tokens JWT (ADR-006 & OWASP ASVS)', () => {
  const passwordService = new PasswordService();
  const jwtSecret = 'test_jwt_secret_minimum_64_characters_super_secure_key_1234567890';
  const refreshSecret = 'test_refresh_jwt_secret_minimum_64_characters_super_secure_key_12345';
  const authService = new AuthService(passwordService, jwtSecret, refreshSecret);

  it('debe generar tokens de acceso JWT válidos con claims de rol e id', () => {
    const userPayload = {
      id: 'usr-admin-01',
      email: 'admin@scienpay.uc.edu.ve',
      fullName: 'Carlos Mendoza',
      role: UserRole.ADMIN,
    };

    const token = authService.generateAccessToken(userPayload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = authService.verifyAccessToken(token);
    assert.equal(decoded.id, userPayload.id);
    assert.equal(decoded.email, userPayload.email);
    assert.equal(decoded.role, UserRole.ADMIN);
  });

  it('debe rechazar un token de acceso alterado o con firma inválida', () => {
    const userPayload = {
      id: 'usr-gen-02',
      email: 'gen@scienpay.uc.edu.ve',
      fullName: 'Elena Rostova',
      role: UserRole.GENERADOR,
    };

    const token = authService.generateAccessToken(userPayload);
    const tamperedToken = token.slice(0, -5) + 'abcde';

    assert.throws(() => authService.verifyAccessToken(tamperedToken), /invalid token|invalid signature/i);
  });

  it('debe generar y verificar refresh tokens con rotación por familia', () => {
    const userPayload = {
      id: 'usr-rec-03',
      email: 'receptor@scienpay.uc.edu.ve',
      fullName: 'Roberto Silva',
      role: UserRole.RECEPTOR,
    };

    const { refreshToken, familyId } = authService.generateRefreshToken(userPayload);
    assert.ok(typeof refreshToken === 'string');
    assert.ok(typeof familyId === 'string');

    const decodedRefresh = authService.verifyRefreshToken(refreshToken);
    assert.equal(decodedRefresh.id, userPayload.id);
    assert.equal(decodedRefresh.familyId, familyId);
  });
});
