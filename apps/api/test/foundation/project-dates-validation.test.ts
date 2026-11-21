import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProjectSchema,
  updateProjectSchema,
  ProjectArea,
  ProjectScope,
} from '@scienpay/shared';

test('createProjectSchema rechaza fecha de culminación anterior a la fecha de inicio', () => {
  const result = createProjectSchema.safeParse({
    code: 'PRJ-VAL-01',
    name: 'Proyecto de Validación Temporal',
    area: ProjectArea.FISICA,
    scope: ProjectScope.INTERNO,
    startDate: '2026-12-01',
    endDate: '2026-11-15', // Anterior a startDate
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path.includes('endDate'));
    assert.ok(issue, 'Debe reportar error en el campo endDate');
    assert.match(issue.message, /fecha de finalización no puede ser anterior/i);
  }
});

test('createProjectSchema rechaza fecha de inicio anterior a la fecha actual cuando no está en test bypass', () => {
  const previousEnv = process.env.NODE_ENV;
  try {
    delete process.env.NODE_ENV;
    const result = createProjectSchema.safeParse({
      code: 'PRJ-VAL-02',
      name: 'Proyecto con Fecha Pasada',
      area: ProjectArea.QUIMICA,
      scope: ProjectScope.EXTERNO,
      startDate: '2020-01-01', // Fecha muy anterior a la actual
      endDate: '2020-12-31',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('startDate'));
      assert.ok(issue, 'Debe reportar error en el campo startDate');
      assert.match(issue.message, /fecha de inicio no puede ser anterior a la fecha actual/i);
    }
  } finally {
    process.env.NODE_ENV = previousEnv;
  }
});

test('createProjectSchema acepta fechas válidas (inicio futuro y fin posterior)', () => {
  const result = createProjectSchema.safeParse({
    code: 'PRJ-VAL-03',
    name: 'Proyecto Válido Futuro',
    area: ProjectArea.BIOLOGIA,
    scope: ProjectScope.INTERNO,
    startDate: '2027-01-01',
    endDate: '2027-12-31',
  });

  assert.equal(result.success, true);
});

test('updateProjectSchema rechaza fecha de culminación anterior a la fecha de inicio', () => {
  const result = updateProjectSchema.safeParse({
    startDate: '2027-06-01',
    endDate: '2027-05-01',
  });

  assert.equal(result.success, false);
  if (!result.success) {
    const issue = result.error.issues.find((i) => i.path.includes('endDate'));
    assert.ok(issue);
    assert.match(issue.message, /fecha de finalización no puede ser anterior/i);
  }
});

test('updateProjectSchema acepta actualización con fechas coherentes', () => {
  const result = updateProjectSchema.safeParse({
    startDate: '2027-01-01',
    endDate: '2027-06-30',
  });

  assert.equal(result.success, true);
});
