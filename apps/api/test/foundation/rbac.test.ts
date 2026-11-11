import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@scienpay/shared';
import {
  RolePermissionsPolicy,
  DomainAction,
} from '../../src/domain/security/role-permissions.policy.js';

describe('Segregación Estricta de Funciones y RBAC en Backend (Especificación de Referencia)', () => {
  describe('Rol: ADMINISTRADOR DEL SISTEMA', () => {
    it('debe tener permiso para gestionar usuarios, parámetros y ver auditoría', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.MANAGE_USERS),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.CONFIGURE_PARAMETERS),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.VIEW_AUDIT_LOGS),
        true,
      );
    });

    it('prohibición estricta: NO puede operar dinero (crear causación, crear solicitud, aprobar ni pagar)', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.GENERATE_CAUSATION),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.CREATE_PAYMENT_REQUEST),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.APPROVE_PAYMENT_REQUEST),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.ADMIN, DomainAction.REGISTER_DISBURSEMENT),
        false,
      );
    });
  });

  describe('Rol: GENERADOR DE NÓMINA (Coordinador General)', () => {
    it('debe tener permiso para gestionar personas, proyectos, asignaciones, generar causación y crear solicitudes', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.MANAGE_PROJECTS),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.MANAGE_BENEFICIARIES),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.MANAGE_ASSIGNMENTS),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.GENERATE_CAUSATION),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.CREATE_PAYMENT_REQUEST),
        true,
      );
    });

    it('prohibición estricta: NO puede aprobar solicitudes ni registrar entrega de fondos (desembolsos)', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.APPROVE_PAYMENT_REQUEST),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.REGISTER_DISBURSEMENT),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.GENERADOR, DomainAction.MANAGE_USERS),
        false,
      );
    });
  });

  describe('Rol: RECEPTOR DE NÓMINA (Gerente de Administración)', () => {
    it('debe tener permiso para evaluar solicitudes (aprobar/rechazar), registrar desembolsos y operar cajas chicas', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.APPROVE_PAYMENT_REQUEST),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.REJECT_PAYMENT_REQUEST),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.REGISTER_DISBURSEMENT),
        true,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.MANAGE_PETTY_CASH),
        true,
      );
    });

    it('prohibición estricta: NO puede crear proyectos, personas, asignaciones, causaciones ni solicitudes de pago', () => {
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.MANAGE_PROJECTS),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.MANAGE_BENEFICIARIES),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.GENERATE_CAUSATION),
        false,
      );
      assert.equal(
        RolePermissionsPolicy.canPerform(UserRole.RECEPTOR, DomainAction.CREATE_PAYMENT_REQUEST),
        false,
      );
    });
  });

  describe('Regla de Cuatro Ojos (Four-Eyes Principle)', () => {
    it('el generador NO puede aprobar sus propias solicitudes incluso si por error tuviera rol concurrente', () => {
      const creatorUserId = 'usr-001';
      const reviewerUserId = 'usr-001';

      assert.equal(
        RolePermissionsPolicy.canApproveRequest(creatorUserId, reviewerUserId, UserRole.RECEPTOR),
        false,
        'La regla de cuatro ojos debe impedir que el creador sea su propio revisor',
      );
    });

    it('un revisor distinto con rol RECEPTOR sí puede aprobar la solicitud', () => {
      const creatorUserId = 'usr-gen-01';
      const reviewerUserId = 'usr-rec-02';

      assert.equal(
        RolePermissionsPolicy.canApproveRequest(creatorUserId, reviewerUserId, UserRole.RECEPTOR),
        true,
      );
    });
  });
});
