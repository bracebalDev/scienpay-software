import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PasswordService } from '../../src/domain/security/password.service.js';
import { AccountSecurityPolicy } from '../../src/domain/security/account-security.policy.js';

describe('Reglas de Seguridad y Autenticación (ADR-006 & Especificación)', () => {
  const passwordService = new PasswordService();

  describe('Hashing de Contraseñas con Argon2id', () => {
    it('debe generar hashes que comiencen con el identificador $argon2id$', async () => {
      const password = 'PasswordSegura2026!';
      const hash = await passwordService.hash(password);

      assert.ok(hash.startsWith('$argon2id$'), 'El hash debe ser de tipo Argon2id');
      assert.notEqual(hash, password, 'La contraseña jamás debe guardarse en texto plano');
    });

    it('debe verificar correctamente una contraseña válida contra su hash', async () => {
      const password = 'PasswordSegura2026!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(hash, password);
      assert.equal(isValid, true, 'La contraseña correcta debe validar satisfactoriamente');
    });

    it('debe rechazar una contraseña incorrecta', async () => {
      const password = 'PasswordSegura2026!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(hash, 'ClaveEquivocada123!');
      assert.equal(isValid, false, 'Una contraseña errónea debe ser rechazada');
    });
  });

  describe('Política Anti-Fuerza Bruta y Bloqueo Escalonado', () => {
    it('primer y segundo intento fallido solo incrementan el contador de errores', () => {
      const state0 = AccountSecurityPolicy.getInitialState();

      const state1 = AccountSecurityPolicy.recordFailedAttempt(state0, Date.now());
      assert.equal(state1.failedAttempts, 1);
      assert.equal(state1.isLocked, false);
      assert.equal(state1.lockoutExpiresAt, null);
      assert.equal(state1.permanentLock, false);

      const state2 = AccountSecurityPolicy.recordFailedAttempt(state1, Date.now());
      assert.equal(state2.failedAttempts, 2);
      assert.equal(state2.isLocked, false);
      assert.equal(state2.lockoutExpiresAt, null);
      assert.equal(state2.permanentLock, false);
    });

    it('al 3er intento fallido se activa un bloqueo temporal de exactamente 5 minutos', () => {
      const now = 1700000000000;
      let state = AccountSecurityPolicy.getInitialState();
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);

      assert.equal(state.failedAttempts, 3);
      assert.equal(state.isLocked, true);
      assert.equal(state.permanentLock, false);
      assert.equal(
        state.lockoutExpiresAt,
        now + 5 * 60 * 1000,
        'Debe expirar exactamente en 5 minutos (300.000 ms)',
      );
    });

    it('al 4to intento fallido se activa el bloqueo permanente de la cuenta', () => {
      const now = 1700000000000;
      let state = AccountSecurityPolicy.getInitialState();
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      state = AccountSecurityPolicy.recordFailedAttempt(state, now);

      assert.equal(state.failedAttempts, 4);
      assert.equal(state.isLocked, true);
      assert.equal(state.permanentLock, true, 'El 4to intento bloquea definitivamente la cuenta');
    });

    it('un intento exitoso limpia los intentos fallidos si no está bloqueado permanentemente', () => {
      let state = AccountSecurityPolicy.getInitialState();
      state = AccountSecurityPolicy.recordFailedAttempt(state, Date.now());
      state = AccountSecurityPolicy.recordFailedAttempt(state, Date.now());

      const resetState = AccountSecurityPolicy.recordSuccessfulAttempt(state);
      assert.equal(resetState.failedAttempts, 0);
      assert.equal(resetState.isLocked, false);
      assert.equal(resetState.lockoutExpiresAt, null);
    });

    it('un usuario con bloqueo permanente no puede reiniciar su estado con intento exitoso', () => {
      const now = Date.now();
      let state = AccountSecurityPolicy.getInitialState();
      for (let i = 0; i < 4; i++) {
        state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      }

      assert.throws(
        () => AccountSecurityPolicy.recordSuccessfulAttempt(state),
        /USUARIO_BLOQUEADO_PERMANENTE/,
      );
    });

    it('únicamente la acción administrativa de ADMIN puede desbloquear una cuenta con bloqueo permanente', () => {
      const now = Date.now();
      let state = AccountSecurityPolicy.getInitialState();
      for (let i = 0; i < 4; i++) {
        state = AccountSecurityPolicy.recordFailedAttempt(state, now);
      }

      const unlockedState = AccountSecurityPolicy.adminUnlockUser(state);
      assert.equal(unlockedState.failedAttempts, 0);
      assert.equal(unlockedState.isLocked, false);
      assert.equal(unlockedState.permanentLock, false);
      assert.equal(unlockedState.lockoutExpiresAt, null);
    });
  });
});
