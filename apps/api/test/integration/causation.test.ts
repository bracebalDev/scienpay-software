import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase, scalar, sql } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();
const projectCode = `CAU${suffix}`;

let projectId = '';
let personId = '';
let groupId = '';
let batchId = '';

const period = {
  periodStartDate: '2026-01-01',
  periodEndDate: '2026-01-31',
};

describe('Integración — Causación, prorrateo, anulación e inmutabilidad', () => {
  it('prepara proyecto, persona, grupo y asignación', async () => {
    const generador = await session('generador');

    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: projectCode,
        name: `Proyecto causación ${suffix}`,
        area: 'QUIMICA',
        scope: 'INTERNO',
        startDate: '2025-12-01',
      },
    });
    assert.equal(project.status, 201, project.text);
    projectId = project.body.id;

    const person = await api<{ id: string }>('/persons', {
      method: 'POST',
      token: generador.token,
      body: {
        documentNumber: `C${suffix}`,
        firstName: 'Carla',
        lastName: `Causación ${suffix}`,
      },
    });
    assert.equal(person.status, 201, person.text);
    personId = person.body.id;

    const group = await api<{ id: string }>('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: { name: `Grupo causación ${suffix}`, periodicity: 'MENSUAL' },
    });
    assert.equal(group.status, 201, group.text);
    groupId = group.body.id;

    const assignment = await api('/assignments', {
      method: 'POST',
      token: generador.token,
      body: {
        personId,
        projectId,
        paymentGroupId: groupId,
        amountPerPeriod: 1000,
        startDate: '2025-12-01',
      },
    });
    assert.equal(assignment.status, 201, assignment.text);
  });

  it('previsualiza la causación del período completo', async () => {
    const generador = await session('generador');
    const response = await api<{
      items: Array<{
        personId: string;
        calculatedAmount: string;
        baseAmount: string;
        totalDaysInPeriod: number;
        activeDays: number;
      }>;
      totalCausationAmount: string;
      itemsCount: number;
    }>('/causation/preview', {
      method: 'POST',
      token: generador.token,
      body: { projectId, paymentGroupId: groupId, ...period },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.itemsCount, 1);
    assert.equal(response.body.items.length, 1);
    assert.equal(Number(response.body.items[0].calculatedAmount), 1000);
    assert.equal(Number(response.body.items[0].baseAmount), 1000);
    assert.equal(response.body.items[0].totalDaysInPeriod, 31);
    assert.equal(response.body.items[0].activeDays, 31);
    assert.equal(Number(response.body.totalCausationAmount), 1000);
  });

  it('rechaza un período invertido', async () => {
    const generador = await session('generador');
    const response = await api('/causation/preview', {
      method: 'POST',
      token: generador.token,
      body: {
        projectId,
        paymentGroupId: groupId,
        periodStartDate: '2026-02-01',
        periodEndDate: '2026-01-01',
      },
    });
    assert.equal(response.status, 400);
  });

  it('un período sin días activos devuelve monto causado cero', async () => {
    const generador = await session('generador');
    const response = await api<{
      items: Array<{ activeDays: number; calculatedAmount: string }>;
      totalCausationAmount: string;
    }>('/causation/preview', {
      method: 'POST',
      token: generador.token,
      body: {
        projectId,
        paymentGroupId: groupId,
        periodStartDate: '2024-01-01',
        periodEndDate: '2024-01-31',
      },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].activeDays, 0);
    assert.equal(Number(response.body.items[0].calculatedAmount), 0);
    assert.equal(Number(response.body.totalCausationAmount), 0);
  });

  it('genera el lote y lo deja en estado CALCULADO', async () => {
    const generador = await session('generador');
    const response = await api<{
      message: string;
      batch: { id: string; status: string; totalCausationAmount: string };
    }>('/causation/generate', {
      method: 'POST',
      token: generador.token,
      body: { projectId, paymentGroupId: groupId, ...period },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.message, 'LOTE_CAUSACION_GENERADO_EXITOSAMENTE');
    assert.equal(response.body.batch.status, 'CALCULADO');
    assert.equal(Number(response.body.batch.totalCausationAmount), 1000);
    batchId = response.body.batch.id;
  });

  it('es idempotente: regenerar el mismo corte responde 409', async () => {
    const generador = await session('generador');
    const response = await api('/causation/generate', {
      method: 'POST',
      token: generador.token,
      body: { projectId, paymentGroupId: groupId, ...period },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /CAUSACION_IDEMPOTENTE/);
  });

  it('el lote guardado cuadra con la suma de sus ítems', async () => {
    const total = await scalar<string>(
      'select sum(calculated_amount)::numeric(14,2) from causation_items where batch_id = $1',
      [batchId],
    );
    const batchTotal = await scalar<string>(
      'select total_causation_amount from causation_batches where id = $1',
      [batchId],
    );
    assert.equal(Number(total), Number(batchTotal));
  });

  it('cada ítem mantiene remaining_debt = calculated - paid', async () => {
    const inconsistent = await scalar<number>(
      `select count(*)::int from causation_items
       where batch_id = $1 and remaining_debt <> (calculated_amount - paid_amount)`,
      [batchId],
    );
    assert.equal(inconsistent, 0);
  });

  it('el ítem queda PENDIENTE con deuda igual al monto calculado', async () => {
    const row = await sql<
      Array<{ status: string; paid: string; remaining: string }>
    >`select status, paid_amount as paid, remaining_debt as remaining from causation_items where batch_id = ${batchId} limit 1`;
    assert.equal(row[0].status, 'PENDIENTE');
    assert.equal(Number(row[0].paid), 0);
    assert.equal(Number(row[0].remaining), 1000);
  });

  it('obtiene el lote por id con sus ítems', async () => {
    const receptor = await session('receptor');
    const response = await api<{ id: string; items: Array<{ id: string }> }>(
      `/causation/batches/${batchId}`,
      { token: receptor.token },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.id, batchId);
    assert.equal(response.body.items.length, 1);
  });

  it('lista los lotes filtrando por proyecto', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string }>>(`/causation/batches?projectId=${projectId}`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.some((batch) => batch.id === batchId));
  });

  it('lista todos los lotes sin filtro de proyecto', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string; projectId: string }>>('/causation/batches', {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.ok(response.body.some((batch) => batch.id === batchId));
  });

  it('el trigger bloquea actualizar calculated_amount', async () => {
    await assert.rejects(
      () => sql`update causation_items set calculated_amount = 1 where batch_id = ${batchId}`,
      (error: Error & { code?: string }) => {
        assert.match(error.message, /VIOLACION_DE_INTEGRIDAD_FINANCIERA/);
        assert.equal(error.code, '55000');
        return true;
      },
    );
  });

  it('el trigger bloquea el DELETE de ítems financieros', async () => {
    await assert.rejects(
      () => sql`delete from causation_items where batch_id = ${batchId}`,
      (error: Error & { code?: string }) => {
        assert.match(error.message, /no admite DELETE/);
        assert.equal(error.code, '55000');
        return true;
      },
    );
  });

  it('el trigger permite actualizar paid_amount y status', async () => {
    let rolledBack = false;
    await assert.rejects(
      () =>
        sql.begin(async (tx) => {
          await tx`update causation_items set paid_amount = 10, status = 'PAGADO_PARCIAL' where batch_id = ${batchId}`;
          rolledBack = true;
          throw new Error('ROLLBACK_INTENCIONAL');
        }),
      /ROLLBACK_INTENCIONAL/,
    );
    assert.equal(rolledBack, true, 'La actualización de columnas permitidas debe ejecutarse');
  });

  it('actualizar un lote sin registrar anulación está bloqueado', async () => {
    await assert.rejects(
      () => sql`update causation_batches set total_causation_amount = 1 where id = ${batchId}`,
      (error: Error & { code?: string }) => {
        assert.match(error.message, /Solo se permite registrar la anulacion/);
        return true;
      },
    );
  });

  it('rechaza anular con motivo demasiado corto', async () => {
    const generador = await session('generador');
    const response = await api(`/causation/batches/${batchId}/annul`, {
      method: 'POST',
      token: generador.token,
      body: { annulmentReason: 'corto' },
    });
    assert.equal(response.status, 400);
  });

  it('anula el lote con justificación y registra auditoría', async () => {
    const generador = await session('generador');
    const reason = 'Anulación de prueba de integración con motivo suficiente';
    const response = await api<{
      message: string;
      batch: { status: string; annulmentReason: string };
    }>(`/causation/batches/${batchId}/annul`, {
      method: 'POST',
      token: generador.token,
      body: { annulmentReason: reason },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.batch.status, 'ANULADO');
    assert.equal(response.body.batch.annulmentReason, reason);

    const audit = await scalar<number>(
      `select count(*)::int from audit_log where action = 'ANULACION_CAUSACION' and entity_id = $1`,
      [batchId],
    );
    assert.equal(audit, 1);
  });

  it('no permite anular dos veces el mismo lote', async () => {
    const generador = await session('generador');
    const response = await api(`/causation/batches/${batchId}/annul`, {
      method: 'POST',
      token: generador.token,
      body: { annulmentReason: 'Segundo intento de anulación del lote' },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /LOTE_YA_ANULADO/);
  });

  it('un lote anulado no bloquea regenerar el mismo corte', async () => {
    const generador = await session('generador');
    const response = await api<{ batch: { id: string; status: string } }>('/causation/generate', {
      method: 'POST',
      token: generador.token,
      body: { projectId, paymentGroupId: groupId, ...period },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.batch.status, 'CALCULADO');
    assert.notEqual(response.body.batch.id, batchId);
  });

  it('los ítems del lote anulado quedan en estado ANULADO', async () => {
    const statuses = await sql<Array<{ status: string }>>`
      select status from causation_items where batch_id = ${batchId}`;
    assert.ok(statuses.length > 0);
    assert.ok(statuses.every((row) => row.status === 'ANULADO'));
  });

  it('un lote inexistente responde 404', async () => {
    const receptor = await session('receptor');
    const response = await api('/causation/batches/33333333-3333-4333-8333-333333333333', {
      token: receptor.token,
    });
    assert.equal(response.status, 404);
  });
});
