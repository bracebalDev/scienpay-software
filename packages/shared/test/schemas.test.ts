import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginSchema,
  createPaymentRequestSchema,
  annulCausationBatchSchema,
  auditQuerySchema,
  createPersonSchema,
} from '../src/index.js';

describe('Shared Schemas — Validación de Contratos Zod (HANDOFF 4.6.3)', () => {
  describe('loginSchema', () => {
    it('debe aceptar login con usuario alfanumérico', () => {
      const parsed = loginSchema.safeParse({
        identifier: 'coordinador_01',
        password: 'Password123!',
      });
      assert.equal(parsed.success, true);
    });

    it('debe aceptar login con correo electrónico', () => {
      const parsed = loginSchema.safeParse({
        identifier: 'coordinador@scienpay.org',
        password: 'Password123!',
      });
      assert.equal(parsed.success, true);
    });

    it('debe rechazar identificador vacío o contraseña menor a 8 caracteres', () => {
      const empty = loginSchema.safeParse({ identifier: '', password: 'short' });
      assert.equal(empty.success, false);
    });
  });

  describe('createPaymentRequestSchema', () => {
    it('debe aceptar solicitud con notas y montos válidos', () => {
      const parsed = createPaymentRequestSchema.safeParse({
        projectId: '11111111-1111-4111-8111-111111111111',
        causationBatchId: '22222222-2222-4222-8222-222222222222',
        requestedAmount: 500,
        notes: 'Notas de justificación de la solicitud',
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.notes, 'Notas de justificación de la solicitud');
      }
    });

    it('debe admitir notas vacías por defecto', () => {
      const parsed = createPaymentRequestSchema.safeParse({
        projectId: '11111111-1111-4111-8111-111111111111',
        causationBatchId: '22222222-2222-4222-8222-222222222222',
        requestedAmount: 100,
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.notes, '');
      }
    });

    it('debe rechazar montos menores a 0.01', () => {
      const parsed = createPaymentRequestSchema.safeParse({
        projectId: '11111111-1111-4111-8111-111111111111',
        causationBatchId: '22222222-2222-4222-8222-222222222222',
        requestedAmount: 0,
      });
      assert.equal(parsed.success, false);
    });
  });

  describe('annulCausationBatchSchema', () => {
    it('debe rechazar motivos con menos de 10 caracteres', () => {
      const parsed = annulCausationBatchSchema.safeParse({ annulmentReason: 'Corto' });
      assert.equal(parsed.success, false);
    });

    it('debe aceptar motivo justificado de más de 10 caracteres', () => {
      const parsed = annulCausationBatchSchema.safeParse({
        annulmentReason: 'Error administrativo en las fechas de corte',
      });
      assert.equal(parsed.success, true);
    });
  });

  describe('auditQuerySchema', () => {
    it('debe aplicar paginación por defecto: page=1, limit=50', () => {
      const parsed = auditQuerySchema.parse({});
      assert.equal(parsed.page, 1);
      assert.equal(parsed.limit, 50);
    });

    it('debe rechazar límites superiores a 200', () => {
      const parsed = auditQuerySchema.safeParse({ limit: 250 });
      assert.equal(parsed.success, false);
    });
  });

  describe('createPersonSchema', () => {
    it('debe validar datos correctos de persona', () => {
      const valid = createPersonSchema.safeParse({
        documentType: 'V',
        documentNumber: '12345678',
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      assert.equal(valid.success, true);

      const invalidDoc = createPersonSchema.safeParse({
        documentType: 'V',
        documentNumber: '12@#$!',
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      assert.equal(invalidDoc.success, false);
    });
  });
});
