import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, BASE_URL, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();

let projectId = '';
let otherProjectId = '';
let personId = '';
let groupId = '';
let batchId = '';
let annulledBatchId = '';

const period = { periodStartDate: '2026-01-01', periodEndDate: '2026-01-31' };

interface RequestRow {
  id: string;
  requestCode: string;
  status: string;
  totalAmountUSD: string;
  projectId: string;
  causationBatchId: string;
  createdByUserId: string;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
}

async function createRequest(
  requestedAmount: number,
  batch = batchId,
  project = projectId,
): Promise<RequestRow> {
  const generador = await session('generador');
  const response = await api<RequestRow>('/payment-requests', {
    method: 'POST',
    token: generador.token,
    body: { projectId: project, causationBatchId: batch, requestedAmount },
  });
  assert.ok([201].includes(response.status), response.text);
  return response.body;
}

async function fetchPdf(path: string, token: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType: response.headers.get('content-type'), buffer };
}

describe('Integración — Solicitudes de pago: estados, PDF y reglas de monto', () => {
  it('prepara proyecto, persona, grupo, asignación y dos lotes de causación', async () => {
    const generador = await session('generador');

    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: `SOL${suffix}`,
        name: `Proyecto solicitudes ${suffix}`,
        area: 'BIOLOGIA',
        scope: 'EXTERNO',
        startDate: '2025-01-01',
      },
    });
    assert.equal(project.status, 201, project.text);
    projectId = project.body.id;

    const other = await api<{ id: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: `OTR${suffix}`,
        name: `Proyecto alterno ${suffix}`,
        area: 'BIOLOGIA',
        scope: 'INTERNO',
        startDate: '2025-01-01',
      },
    });
    assert.equal(other.status, 201, other.text);
    otherProjectId = other.body.id;

    const person = await api<{ id: string }>('/persons', {
      method: 'POST',
      token: generador.token,
      body: {
        documentNumber: `S${suffix}`,
        firstName: 'Sofía',
        lastName: `Solicitudes ${suffix}`,
      },
    });
    assert.equal(person.status, 201, person.text);
    personId = person.body.id;

    const group = await api<{ id: string }>('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: { name: `Grupo solicitudes ${suffix}`, periodicity: 'MENSUAL' },
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
        startDate: '2025-01-01',
      },
    });
    assert.equal(assignment.status, 201, assignment.text);

    const batch = await api<{ batch: { id: string } }>('/causation/generate', {
      method: 'POST',
      token: generador.token,
      body: { projectId, paymentGroupId: groupId, ...period },
    });
    assert.equal(batch.status, 201, batch.text);
    batchId = batch.body.batch.id;

    const february = await api<{ batch: { id: string } }>('/causation/generate', {
      method: 'POST',
      token: generador.token,
      body: {
        projectId,
        paymentGroupId: groupId,
        periodStartDate: '2026-02-01',
        periodEndDate: '2026-02-28',
      },
    });
    assert.equal(february.status, 201, february.text);
    annulledBatchId = february.body.batch.id;

    const annulled = await api(`/causation/batches/${annulledBatchId}/annul`, {
      method: 'POST',
      token: generador.token,
      body: { annulmentReason: 'Lote anulado para probar la regla de solicitudes' },
    });
    assert.equal(annulled.status, 201, annulled.text);
  });

  it('crea una solicitud en BORRADOR con código SOL-YYYY-NNN', async () => {
    const created = await createRequest(1000);
    assert.equal(created.status, 'BORRADOR');
    assert.match(created.requestCode, /^SOL-\d{4}-\d{3,}$/, created.requestCode);
    assert.equal(Number(created.totalAmountUSD), 1000);
    assert.equal(created.projectId, projectId);
    assert.equal(created.causationBatchId, batchId);
    assert.equal(created.reviewedByUserId, null);
  });

  it('lista las solicitudes filtrando por proyecto', async () => {
    const receptor = await session('receptor');
    const response = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.length >= 1);
    assert.ok(response.body.every((row) => row.projectId === projectId));
  });

  it('lista todas las solicitudes sin filtro', async () => {
    const receptor = await session('receptor');
    const response = await api<RequestRow[]>('/payment-requests', { token: receptor.token });
    assert.equal(response.status, 200);
    assert.ok(response.body.length >= 1);
  });

  it('obtiene una solicitud por id y responde 404 si no existe', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const detail = await api<RequestRow>(`/payment-requests/${list.body[0].id}`, {
      token: receptor.token,
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, list.body[0].id);

    const missing = await api('/payment-requests/44444444-4444-4444-8444-444444444444', {
      token: receptor.token,
    });
    assert.equal(missing.status, 404);
    assert.match(missing.text, /SOLICITUD_NO_ENCONTRADA/);
  });

  it('aprobar una solicitud inexistente responde 404', async () => {
    const receptor = await session('receptor');
    const response = await api('/payment-requests/45454545-4545-4545-8545-454545454545/approve', {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 404);
    assert.match(response.text, /SOLICITUD_NO_ENCONTRADA/);
  });

  it('rechaza un monto que excede el total causado del lote', async () => {
    const generador = await session('generador');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: { projectId, causationBatchId: batchId, requestedAmount: 1000.01 },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /MONTO_EXCEDE_CAUSACION/);
  });

  it('rechaza un lote que no pertenece al proyecto indicado', async () => {
    const generador = await session('generador');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: { projectId: otherProjectId, causationBatchId: batchId, requestedAmount: 10 },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /PROYECTO_INCOMPATIBLE/);
  });

  it('rechaza un lote anulado', async () => {
    const generador = await session('generador');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: { projectId, causationBatchId: annulledBatchId, requestedAmount: 10 },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /LOTE_ANULADO/);
  });

  it('rechaza un lote inexistente con 404', async () => {
    const generador = await session('generador');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: {
        projectId,
        causationBatchId: '55555555-5555-4555-8555-555555555555',
        requestedAmount: 10,
      },
    });
    assert.equal(response.status, 404);
    assert.match(response.text, /LOTE_NO_ENCONTRADO/);
  });

  it('rechaza un monto por debajo del mínimo con 400', async () => {
    const generador = await session('generador');
    const response = await api('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: { projectId, causationBatchId: batchId, requestedAmount: 0 },
    });
    assert.equal(response.status, 400);
    assert.match(response.text, /DATOS_INVALIDOS/);
  });

  it('envía la solicitud y la deja ENVIADA', async () => {
    const generador = await session('generador');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: generador.token,
    });
    const draft = list.body.find((row) => row.status === 'BORRADOR');
    assert.ok(draft, 'Debe existir una solicitud en borrador');

    const response = await api<RequestRow>(`/payment-requests/${draft.id}/send`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'ENVIADA');
  });

  it('rechaza enviar dos veces la misma solicitud con 409', async () => {
    const generador = await session('generador');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: generador.token,
    });
    const sent = list.body.find((row) => row.status === 'ENVIADA');
    assert.ok(sent);
    const response = await api(`/payment-requests/${sent.id}/send`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(response.status, 409, 'Una transición inválida no debe devolver 500');
    assert.match(response.text, /TRANSICION_ESTADO_INVALIDA/);
  });

  it('rechaza anular una aprobación pendiente con motivo corto', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const sent = list.body.find((row) => row.status === 'ENVIADA');
    assert.ok(sent);
    const response = await api(`/payment-requests/${sent.id}/reject`, {
      method: 'PATCH',
      token: receptor.token,
      body: { rejectionReason: 'corto' },
    });
    assert.equal(response.status, 400);
  });

  it('el receptor rechaza formalmente la solicitud enviada', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const sent = list.body.find((row) => row.status === 'ENVIADA');
    assert.ok(sent);

    const reason = 'Documentación de respaldo insuficiente para este período';
    const response = await api<RequestRow>(`/payment-requests/${sent.id}/reject`, {
      method: 'PATCH',
      token: receptor.token,
      body: { rejectionReason: reason },
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'RECHAZADA');
    assert.equal(response.body.rejectionReason, reason);
    assert.equal(response.body.reviewedByUserId, receptor.user.id);
  });

  it('una solicitud rechazada no puede cerrarse', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const rejected = list.body.find((row) => row.status === 'RECHAZADA');
    assert.ok(rejected);
    const response = await api(`/payment-requests/${rejected.id}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /TRANSICION_ESTADO_INVALIDA/);
  });

  it('crea, envía y aprueba una segunda solicitud registrando al revisor', async () => {
    const generador = await session('generador');
    const receptor = await session('receptor');
    const created = await createRequest(1000);

    const sent = await api<RequestRow>(`/payment-requests/${created.id}/send`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(sent.status, 200);
    assert.equal(sent.body.status, 'ENVIADA');

    const approved = await api<RequestRow>(`/payment-requests/${created.id}/approve`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(approved.status, 200, approved.text);
    assert.equal(approved.body.status, 'APROBADA');
    assert.equal(approved.body.reviewedByUserId, receptor.user.id);
  });

  it('no permite aprobar dos veces ni cerrar una solicitud aprobada', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const approved = list.body.find((row) => row.status === 'APROBADA');
    assert.ok(approved);

    const reapprove = await api(`/payment-requests/${approved.id}/approve`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(reapprove.status, 409);
    assert.match(reapprove.text, /TRANSICION_ESTADO_INVALIDA/);

    const close = await api(`/payment-requests/${approved.id}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(close.status, 409, 'Solo una solicitud ENTREGADA puede cerrarse');
  });

  it('no permite rechazar una solicitud ya aprobada', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const approved = list.body.find((row) => row.status === 'APROBADA');
    assert.ok(approved);
    const response = await api(`/payment-requests/${approved.id}/reject`, {
      method: 'PATCH',
      token: receptor.token,
      body: { rejectionReason: 'Motivo suficientemente largo para el intento' },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /TRANSICION_ESTADO_INVALIDA/);
  });

  it('devuelve el PDF consolidado de la solicitud', async () => {
    const receptor = await session('receptor');
    const list = await api<RequestRow[]>(`/payment-requests?projectId=${projectId}`, {
      token: receptor.token,
    });
    const request = list.body[0];

    const pdf = await fetchPdf(`/payment-requests/${request.id}/pdf`, receptor.token);
    assert.equal(pdf.status, 200);
    assert.match(pdf.contentType ?? '', /application\/pdf/);
    assert.equal(pdf.buffer.subarray(0, 4).toString('latin1'), '%PDF');
    assert.ok(pdf.buffer.length > 1000, 'El PDF debe tener contenido');
    assert.equal(pdf.buffer.subarray(-6).toString('latin1').trim(), '%%EOF');
  });

  it('el PDF de una solicitud inexistente responde 404', async () => {
    const receptor = await session('receptor');
    const response = await api('/payment-requests/66666666-6666-4666-8666-666666666666/pdf', {
      token: receptor.token,
    });
    assert.equal(response.status, 404);
  });
});
