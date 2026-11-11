import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  session,
  BASE_URL_RATELIMIT,
  CREDENTIALS,
  RUN_SUFFIX,
} from '../helpers/integration-env.js';
import { closeDatabase } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const RANDOM_UUID = '11111111-1111-4111-8111-111111111111';

const validProject = {
  code: `SEC${RUN_SUFFIX.slice(-6).toUpperCase()}`,
  name: 'Proyecto de prueba RBAC',
  area: 'FISICA',
  scope: 'INTERNO',
  startDate: '2026-01-01',
};

describe('Integración — Seguridad, RBAC y validación de borde', () => {
  it('sin token, los endpoints protegidos responden 401', async () => {
    for (const path of [
      '/projects',
      '/persons',
      '/assignments',
      '/causation/batches',
      '/payment-requests',
      '/disbursements',
      '/petty-cash',
      '/users',
      '/audit',
    ]) {
      const response = await api(path);
      assert.equal(response.status, 401, `${path} debería responder 401 sin token`);
    }
  });

  it('ADMIN no puede operar dinero (crear proyecto)', async () => {
    const admin = await session('admin');
    const response = await api('/projects', {
      method: 'POST',
      token: admin.token,
      body: validProject,
    });
    assert.equal(response.status, 403);
  });

  it('ADMIN no puede crear personas', async () => {
    const admin = await session('admin');
    const response = await api('/persons', {
      method: 'POST',
      token: admin.token,
      body: { documentNumber: `A-${RUN_SUFFIX}`, firstName: 'Ana', lastName: 'Admin' },
    });
    assert.equal(response.status, 403);
  });

  it('ADMIN no puede generar causación', async () => {
    const admin = await session('admin');
    const response = await api('/causation/generate', {
      method: 'POST',
      token: admin.token,
      body: {
        projectId: RANDOM_UUID,
        paymentGroupId: RANDOM_UUID,
        periodStartDate: '2026-01-01',
        periodEndDate: '2026-01-31',
      },
    });
    assert.equal(response.status, 403);
  });

  it('ADMIN no puede crear solicitudes de pago', async () => {
    const admin = await session('admin');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: admin.token,
      body: {
        projectId: RANDOM_UUID,
        causationBatchId: RANDOM_UUID,
        requestedAmount: 10,
      },
    });
    assert.equal(response.status, 403);
  });

  it('ADMIN no puede registrar desembolsos', async () => {
    const admin = await session('admin');
    const response = await api('/disbursements', {
      method: 'POST',
      token: admin.token,
      body: {
        paymentRequestId: RANDOM_UUID,
        totalDeliveredAmount: 10,
        paymentMethod: 'TRANSFERENCIA',
        allocations: [{ personId: RANDOM_UUID, amount: 10 }],
      },
    });
    assert.equal(response.status, 403);
  });

  it('ADMIN no puede crear cajas chicas', async () => {
    const admin = await session('admin');
    const response = await api('/petty-cash', {
      method: 'POST',
      token: admin.token,
      body: { name: 'Caja RBAC', custodianName: 'Alguien', projectIds: [RANDOM_UUID] },
    });
    assert.equal(response.status, 403);
  });

  it('GENERADOR no puede aprobar solicitudes', async () => {
    const generador = await session('generador');
    const response = await api(`/payment-requests/${RANDOM_UUID}/approve`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(response.status, 403);
  });

  it('GENERADOR no puede rechazar solicitudes', async () => {
    const generador = await session('generador');
    const response = await api(`/payment-requests/${RANDOM_UUID}/reject`, {
      method: 'PATCH',
      token: generador.token,
      body: { rejectionReason: 'Motivo suficientemente largo' },
    });
    assert.equal(response.status, 403);
  });

  it('GENERADOR no puede registrar desembolsos', async () => {
    const generador = await session('generador');
    const response = await api('/disbursements', {
      method: 'POST',
      token: generador.token,
      body: {
        paymentRequestId: RANDOM_UUID,
        totalDeliveredAmount: 10,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId: RANDOM_UUID, amount: 10 }],
      },
    });
    assert.equal(response.status, 403);
  });

  it('GENERADOR no puede administrar usuarios', async () => {
    const generador = await session('generador');
    const response = await api('/users', { token: generador.token });
    assert.equal(response.status, 403);
  });

  it('GENERADOR no puede ver la auditoría', async () => {
    const generador = await session('generador');
    const response = await api('/audit', { token: generador.token });
    assert.equal(response.status, 403);
  });

  it('RECEPTOR no puede crear proyectos', async () => {
    const receptor = await session('receptor');
    const response = await api('/projects', {
      method: 'POST',
      token: receptor.token,
      body: validProject,
    });
    assert.equal(response.status, 403);
  });

  it('RECEPTOR no puede crear causación ni previsualizarla', async () => {
    const receptor = await session('receptor');
    const body = {
      projectId: RANDOM_UUID,
      paymentGroupId: RANDOM_UUID,
      periodStartDate: '2026-01-01',
      periodEndDate: '2026-01-31',
    };
    const preview = await api('/causation/preview', {
      method: 'POST',
      token: receptor.token,
      body,
    });
    assert.equal(preview.status, 403);

    const generate = await api('/causation/generate', {
      method: 'POST',
      token: receptor.token,
      body,
    });
    assert.equal(generate.status, 403);
  });

  it('RECEPTOR no puede crear personas ni asignaciones', async () => {
    const receptor = await session('receptor');
    const person = await api('/persons', {
      method: 'POST',
      token: receptor.token,
      body: { documentNumber: `R-${RUN_SUFFIX}`, firstName: 'Rita', lastName: 'Receptora' },
    });
    assert.equal(person.status, 403);

    const assignment = await api('/assignments', {
      method: 'POST',
      token: receptor.token,
      body: {
        personId: RANDOM_UUID,
        projectId: RANDOM_UUID,
        paymentGroupId: RANDOM_UUID,
        amountPerPeriod: 100,
        startDate: '2026-01-01',
      },
    });
    assert.equal(assignment.status, 403);
  });

  it('RECEPTOR no puede ver la auditoría', async () => {
    const receptor = await session('receptor');
    const response = await api('/audit', { token: receptor.token });
    assert.equal(response.status, 403);
  });

  it('un UUID inválido en el path responde 400 UUID_INVALIDO', async () => {
    const receptor = await session('receptor');
    for (const path of [
      '/projects/no-es-uuid',
      '/persons/no-es-uuid',
      '/assignments/no-es-uuid',
      '/causation/batches/no-es-uuid',
      '/payment-requests/no-es-uuid',
    ]) {
      const response = await api(path, { token: receptor.token });
      assert.equal(response.status, 400, `${path} debería responder 400`);
      assert.match(response.text, /UUID_INVALIDO/);
    }
  });

  it('un UUID inválido en query responde 400', async () => {
    const receptor = await session('receptor');
    for (const path of [
      '/assignments?projectId=no-es-uuid',
      '/causation/batches?projectId=no-es-uuid',
      '/payment-requests?projectId=no-es-uuid',
      '/disbursements?requestId=no-es-uuid',
    ]) {
      const response = await api(path, { token: receptor.token });
      assert.equal(response.status, 400, `${path} debería responder 400`);
      assert.match(response.text, /UUID_INVALIDO/);
    }
  });

  it('la auditoría rechaza UUID inválido de usuario', async () => {
    const admin = await session('admin');
    const response = await api('/audit?userId=no-es-uuid', { token: admin.token });
    assert.equal(response.status, 400);
  });

  it('el body inválido responde 400 con detalle por campo', async () => {
    const generador = await session('generador');
    const response = await api<{ details?: Array<{ path: string; message: string }> }>(
      '/projects',
      {
        method: 'POST',
        token: generador.token,
        body: { code: 'x', name: 'a', area: 'NO_EXISTE', scope: 'INTERNO', startDate: 'ayer' },
      },
    );
    assert.equal(response.status, 400);
    assert.match(response.text, /DATOS_INVALIDOS/);
    const paths = (response.body?.details ?? []).map((detail) => detail.path);
    assert.ok(paths.includes('code'), `Campos reportados: ${paths.join(', ')}`);
    assert.ok(paths.includes('area'), `Campos reportados: ${paths.join(', ')}`);
    assert.ok(paths.includes('startDate'), `Campos reportados: ${paths.join(', ')}`);
  });

  it('un campo extra no rompe la validación (Zod ignora desconocidos)', async () => {
    const generador = await session('generador');
    const response = await api('/projects', {
      method: 'POST',
      token: generador.token,
      body: { ...validProject, campoExtra: 'ignorado' },
    });
    assert.ok([201, 409].includes(response.status), response.text);
  });

  it('el rate limit de login responde 429 al tercer intento en la instancia restringida', async () => {
    const results = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      results.push(
        await api('/auth/login', {
          method: 'POST',
          baseUrl: BASE_URL_RATELIMIT,
          body: { identifier: `nadie-${attempt}`, password: 'ClaveSegura#2026' },
        }),
      );
    }
    const statuses = results.map((result) => result.status);
    assert.deepEqual(statuses.slice(0, 2), [401, 401], `Intentos previos: ${statuses}`);
    assert.equal(results[2].status, 429);
    assert.match(results[2].text, /DEMASIADAS_SOLICITUDES/);
  });

  it('el rate limit no afecta a la instancia principal de la suite', async () => {
    const response = await api('/auth/login', {
      method: 'POST',
      body: CREDENTIALS.receptor,
    });
    assert.equal(response.status, 200);
  });
});
