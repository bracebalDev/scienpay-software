import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();
const projectCode = `CAT${suffix}`;

let projectId = '';
let personId = '';
let paymentGroupId = '';

describe('Integración — Catálogos: proyectos, personas, grupos y asignaciones', () => {
  it('lista proyectos existentes del seed', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string; code: string }>>('/projects', {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.ok(response.body.length >= 3, 'El seed debe traer al menos 3 proyectos');
  });

  it('crea un proyecto como GENERADOR', async () => {
    const generador = await session('generador');
    const response = await api<{ id: string; code: string; status: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: projectCode,
        name: `Proyecto catálogo ${suffix}`,
        description: 'Creado por la suite de integración',
        area: 'FISICA',
        scope: 'INTERNO',
        startDate: '2026-01-01',
      },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.code, projectCode);
    assert.equal(response.body.status, 'ACTIVO');
    projectId = response.body.id;
  });

  it('rechaza un código de proyecto duplicado con 409', async () => {
    const generador = await session('generador');
    const response = await api('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: projectCode,
        name: 'Duplicado',
        area: 'FISICA',
        scope: 'INTERNO',
        startDate: '2026-01-01',
      },
    });
    assert.equal(response.status, 409, response.text);
  });

  it('obtiene el proyecto por id', async () => {
    const receptor = await session('receptor');
    const response = await api<{ id: string; name: string }>(`/projects/${projectId}`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.id, projectId);
  });

  it('actualiza el proyecto (PATCH) y cambia su estado', async () => {
    const generador = await session('generador');
    const response = await api<{ status: string; name: string }>(`/projects/${projectId}`, {
      method: 'PATCH',
      token: generador.token,
      body: { status: 'INACTIVO', name: 'Proyecto catálogo actualizado' },
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'INACTIVO');
    assert.equal(response.body.name, 'Proyecto catálogo actualizado');
  });

  it('un id inexistente responde 404', async () => {
    const receptor = await session('receptor');
    const response = await api('/projects/22222222-2222-4222-8222-222222222222', {
      token: receptor.token,
    });
    assert.equal(response.status, 404);
  });

  it('crea una persona como GENERADOR', async () => {
    const generador = await session('generador');
    const response = await api<{ id: string; documentNumber: string; status: string }>('/persons', {
      method: 'POST',
      token: generador.token,
      body: {
        documentType: 'V',
        documentNumber: `QA${suffix}`,
        firstName: 'Bárbara',
        lastName: `Integración ${suffix}`,
        email: `barbara-${RUN_SUFFIX}@scienpay.test`,
      },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.status, 'ACTIVO');
    personId = response.body.id;
  });

  it('rechaza documento duplicado con 409', async () => {
    const generador = await session('generador');
    const response = await api('/persons', {
      method: 'POST',
      token: generador.token,
      body: { documentNumber: `QA${suffix}`, firstName: 'Otra', lastName: 'Persona' },
    });
    assert.equal(response.status, 409, response.text);
  });

  it('valida el formato del documento de identidad', async () => {
    const generador = await session('generador');
    const response = await api('/persons', {
      method: 'POST',
      token: generador.token,
      body: { documentNumber: 'in valido!', firstName: 'X', lastName: 'Y' },
    });
    assert.equal(response.status, 400);
  });

  it('lista personas y encuentra la recién creada', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string }>>('/persons', { token: receptor.token });
    assert.equal(response.status, 200);
    assert.ok(response.body.some((person) => person.id === personId));
  });

  it('actualiza una persona', async () => {
    const generador = await session('generador');
    const response = await api<{ phone: string; status: string }>(`/persons/${personId}`, {
      method: 'PATCH',
      token: generador.token,
      body: { phone: '+58-412-0000000', status: 'ACTIVO' },
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.phone, '+58-412-0000000');
  });

  it('crea un grupo de pago mensual', async () => {
    const generador = await session('generador');
    const response = await api<{ id: string; name: string }>('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: {
        name: `Grupo integración ${suffix}`,
        periodicity: 'MENSUAL',
        cutOffConfig: { dayOfMonth: 30 },
        description: 'Grupo de la suite',
      },
    });
    assert.equal(response.status, 201, response.text);
    paymentGroupId = response.body.id;
  });

  it('rechaza periodicidad inválida', async () => {
    const generador = await session('generador');
    const response = await api('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: { name: 'Grupo inválido', periodicity: 'DIARIO' },
    });
    assert.equal(response.status, 400);
  });

  it('lista grupos y obtiene el grupo por id', async () => {
    const receptor = await session('receptor');
    const list = await api<Array<{ id: string }>>('/payment-groups', { token: receptor.token });
    assert.equal(list.status, 200);
    assert.ok(list.body.some((group) => group.id === paymentGroupId));

    const detail = await api<{ id: string }>(`/payment-groups/${paymentGroupId}`, {
      token: receptor.token,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, paymentGroupId);
  });

  it('crea una asignación activa', async () => {
    const generador = await session('generador');
    const response = await api<{ id: string; status: string; amountPerPeriod: string }>(
      '/assignments',
      {
        method: 'POST',
        token: generador.token,
        body: {
          personId,
          projectId,
          paymentGroupId,
          amountPerPeriod: 750.5,
          startDate: '2026-01-01',
          notes: 'Asignación de integración',
        },
      },
    );
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.status, 'ACTIVO');
    assert.equal(Number(response.body.amountPerPeriod), 750.5);
  });

  it('rechaza una asignación solapada para la misma persona y proyecto', async () => {
    const generador = await session('generador');
    const response = await api('/assignments', {
      method: 'POST',
      token: generador.token,
      body: {
        personId,
        projectId,
        paymentGroupId,
        amountPerPeriod: 500,
        startDate: '2026-02-01',
      },
    });
    assert.equal(response.status, 409, response.text);
  });

  it('lista asignaciones filtradas por proyecto', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string }>>(`/assignments?projectId=${projectId}`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.length >= 1);
  });

  it('finaliza una asignación con justificación', async () => {
    const generador = await session('generador');
    const list = await api<Array<{ id: string }>>(`/assignments?projectId=${projectId}`, {
      token: generador.token,
    });
    const assignmentId = list.body[0].id;

    const response = await api<{ status: string }>(`/assignments/${assignmentId}/terminate`, {
      method: 'PATCH',
      token: generador.token,
      body: { endDate: '2026-03-31', reason: 'Fin del contrato de integración' },
    });
    assert.equal(response.status, 200, response.text);
    assert.notEqual(response.body.status, 'ACTIVO');
  });

  it('rechaza finalizar con justificación demasiado corta', async () => {
    const generador = await session('generador');
    const list = await api<Array<{ id: string }>>('/assignments', { token: generador.token });
    const assignmentId = list.body[0].id;
    const response = await api(`/assignments/${assignmentId}/terminate`, {
      method: 'PATCH',
      token: generador.token,
      body: { endDate: '2026-03-31', reason: 'abc' },
    });
    assert.equal(response.status, 400);
  });

  it('una persona inexistente responde 404', async () => {
    const receptor = await session('receptor');
    const response = await api('/persons/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', {
      token: receptor.token,
    });
    assert.equal(response.status, 404);
  });
});
