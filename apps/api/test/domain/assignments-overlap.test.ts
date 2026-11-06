import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssignmentOverlapPolicy, AssignmentDateRange } from '../../src/domain/assignments/assignment-overlap.policy.js';

describe('Reglas de Dominio: Asignaciones y Prevención de Solapamiento (Especificación)', () => {
  it('permite una asignación si no existen asignaciones previas para la persona en el proyecto', () => {
    const existing: AssignmentDateRange[] = [];
    const newAssignment: AssignmentDateRange = {
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, newAssignment), false);
  });

  it('permite asignaciones consecutivas sin intersección (cambio de monto a mitad de año)', () => {
    const existing: AssignmentDateRange[] = [
      { startDate: '2026-01-01', endDate: '2026-06-30' },
    ];
    const nextAssignment: AssignmentDateRange = {
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, nextAssignment), false);
  });

  it('rechaza una asignación que se solape totalmente dentro de un período ya asignado', () => {
    const existing: AssignmentDateRange[] = [
      { startDate: '2026-01-01', endDate: '2026-12-31' },
    ];
    const overlapping: AssignmentDateRange = {
      startDate: '2026-03-01',
      endDate: '2026-05-31',
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, overlapping), true);
  });

  it('rechaza una asignación que inicie antes de que culmine la anterior', () => {
    const existing: AssignmentDateRange[] = [
      { startDate: '2026-01-01', endDate: '2026-06-30' },
    ];
    const overlapping: AssignmentDateRange = {
      startDate: '2026-06-15',
      endDate: '2026-12-31',
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, overlapping), true);
  });

  it('rechaza una asignación indefinida (sin endDate) si ya existe otra activa indefinida', () => {
    const existing: AssignmentDateRange[] = [
      { startDate: '2026-01-01', endDate: null },
    ];
    const newAssignment: AssignmentDateRange = {
      startDate: '2026-05-01',
      endDate: null,
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, newAssignment), true);
  });

  it('rechaza solapamiento en el mismo día exacto (días inclusivos)', () => {
    const existing: AssignmentDateRange[] = [
      { startDate: '2026-01-01', endDate: '2026-03-31' },
    ];
    const overlapping: AssignmentDateRange = {
      startDate: '2026-03-31',
      endDate: '2026-06-30',
    };

    assert.equal(AssignmentOverlapPolicy.hasOverlap(existing, overlapping), true);
  });
});
