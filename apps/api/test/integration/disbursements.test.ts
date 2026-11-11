import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, BASE_URL, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase, scalar, sql } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();

let projectId = '';
let personId = '';
let groupId = '';
let firstRequestId = '';
let secondRequestId = '';
let draftRequestId = '';
let overpayRequestId = '';
let firstReceiptId = '';
let firstReceiptNumber = '';
let secondReceiptNumber = '';

interface RequestRow {
  id: string;
  requestCode: string;
  status: string;
}

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  totalAmountUSD: string;
  remainingDebtAfterUSD: string;
  personId: string;
}

interface DisbursementResponse {
  message: string;
  disbursement: { id: string; totalAmount: string; paymentMethod: string };
  receipts: ReceiptRow[];
}

async function createApprovedRequest(amount: number, causationBatchId: string): Promise<string> {
  const generador = await session('generador');
  const receptor = await session('receptor');

  const created = await api<RequestRow>('/payment-requests', {
    method: 'POST',
    token: generador.token,
    body: { projectId, causationBatchId, requestedAmount: amount },
  });
  assert.equal(created.status, 201, created.text);

  const sent = await api(`/payment-requests/${created.body.id}/send`, {
    method: 'PATCH',
    token: generador.token,
  });
  assert.equal(sent.status, 200, sent.text);

  const approved = await api(`/payment-requests/${created.body.id}/approve`, {
    method: 'PATCH',
    token: receptor.token,
  });
  assert.equal(approved.status, 200, approved.text);

  return created.body.id;
}

async function fetchPdf(path: string, token: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType: response.headers.get('content-type'), buffer };
}

describe('Integración — Desembolsos: FIFO, recibos inmutables y correlatividad', () => {
  it('prepara proyecto, persona, asignación y dos cortes causados', async () => {
    const generador = await session('generador');

    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: `DES${suffix}`,
        name: `Proyecto desembolsos ${suffix}`,
        area: 'QUIMICA',
        scope: 'EXTERNO',
        startDate: '2025-01-01',
      },
    });
    assert.equal(project.status, 201, project.text);
    projectId = project.body.id;

    const person = await api<{ id: string }>('/persons', {
      method: 'POST',
      token: generador.token,
      body: {
        documentNumber: `D${suffix}`,
        firstName: 'Diego',
        lastName: `Desembolsos ${suffix}`,
      },
    });
    assert.equal(person.status, 201, person.text);
    personId = person.body.id;

    const group = await api<{ id: string }>('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: { name: `Grupo desembolsos ${suffix}`, periodicity: 'MENSUAL' },
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

    for (const [start, end] of [
      ['2026-01-01', '2026-01-31'],
      ['2026-02-01', '2026-02-28'],
    ]) {
      const batch = await api('/causation/generate', {
        method: 'POST',
        token: generador.token,
        body: {
          projectId,
          paymentGroupId: groupId,
          periodStartDate: start,
          periodEndDate: end,
        },
      });
      assert.equal(batch.status, 201, batch.text);
    }
  });

  it('registra un desembolso parcial y emite un recibo', async () => {
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date limit 1',
      [projectId],
    );

    firstRequestId = await createApprovedRequest(1000, batchId);

    const response = await api<DisbursementResponse>('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: firstRequestId,
        totalDeliveredAmount: 600,
        paymentMethod: 'TRANSFERENCIA',
        referenceNumber: 'TRF-INTEGRACION-001',
        notes: 'Abono parcial de la suite',
        allocations: [{ personId, amount: 600 }],
      },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.message, 'DESEMBOLSO_REGISTRADO_EXITOSAMENTE');
    assert.equal(Number(response.body.disbursement.totalAmount), 600);
    assert.equal(response.body.receipts.length, 1);

    const receipt = response.body.receipts[0];
    assert.match(receipt.receiptNumber, /^REC-\d{4}-\d{6}$/, receipt.receiptNumber);
    assert.equal(Number(receipt.totalAmountUSD), 600);
    // Quedan pendientes 400 de enero y 1000 de febrero para esta persona.
    assert.equal(Number(receipt.remainingDebtAfterUSD), 1400);

    firstReceiptId = receipt.id;
    firstReceiptNumber = receipt.receiptNumber;
  });

  it('actualiza la causación con pago parcial y deuda restante consistentes', async () => {
    const row = await sql<
      Array<{ paid: string; remaining: string; status: string; calculated: string }>
    >`select paid_amount as paid, remaining_debt as remaining, status, calculated_amount as calculated
      from causation_items
      where person_id = ${personId} and period_start_date = '2026-01-01'`;
    assert.equal(row.length, 1);
    assert.equal(Number(row[0].paid), 600);
    assert.equal(Number(row[0].remaining), 400);
    assert.equal(Number(row[0].calculated), 1000);
    assert.equal(row[0].status, 'PAGADO_PARCIAL');
  });

  it('la solicitud pasa a ENTREGADA tras el desembolso', async () => {
    const receptor = await session('receptor');
    const response = await api<RequestRow>(`/payment-requests/${firstRequestId}`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ENTREGADA');
  });

  it('lista los desembolsos de la solicitud y los recibos de la persona', async () => {
    const receptor = await session('receptor');
    const disbursements = await api<Array<{ id: string }>>(
      `/disbursements?requestId=${firstRequestId}`,
      { token: receptor.token },
    );
    assert.equal(disbursements.status, 200);
    assert.equal(disbursements.body.length, 1);

    const receipts = await api<ReceiptRow[]>(`/disbursements/receipts?personId=${personId}`, {
      token: receptor.token,
    });
    assert.equal(receipts.status, 200);
    assert.ok(receipts.body.some((receipt) => receipt.id === firstReceiptId));

    const all = await api<Array<{ id: string }>>('/disbursements', { token: receptor.token });
    assert.equal(all.status, 200);
    assert.ok(Array.isArray(all.body));
    assert.ok(all.body.some((row) => row.id === disbursements.body[0].id));
  });

  it('obtiene el detalle del recibo con sus imputaciones', async () => {
    const receptor = await session('receptor');
    const response = await api<{
      id: string;
      receiptNumber: string;
      projectId: string;
      allocations: Array<{ allocatedAmountUSD: string; debtAfterAllocationUSD: string }>;
    }>(`/disbursements/receipts/${firstReceiptId}`, { token: receptor.token });
    assert.equal(response.status, 200);
    assert.equal(response.body.id, firstReceiptId);
    assert.equal(response.body.projectId, projectId);
    assert.equal(response.body.allocations.length, 1);
    assert.equal(Number(response.body.allocations[0].allocatedAmountUSD), 600);
    assert.equal(Number(response.body.allocations[0].debtAfterAllocationUSD), 400);
  });

  it('devuelve el PDF del recibo', async () => {
    const receptor = await session('receptor');
    const pdf = await fetchPdf(`/disbursements/receipts/${firstReceiptId}/pdf`, receptor.token);
    assert.equal(pdf.status, 200);
    assert.match(pdf.contentType ?? '', /application\/pdf/);
    assert.equal(pdf.buffer.subarray(0, 4).toString('latin1'), '%PDF');
    assert.ok(pdf.buffer.length > 1000);
  });

  it('un recibo inexistente responde 404 en detalle y en PDF', async () => {
    const receptor = await session('receptor');
    const missing = '77777777-7777-4777-8777-777777777777';
    const detail = await api(`/disbursements/receipts/${missing}`, { token: receptor.token });
    assert.equal(detail.status, 404);
    assert.match(detail.text, /RECIBO_NO_ENCONTRADO/);

    const pdf = await api(`/disbursements/receipts/${missing}/pdf`, { token: receptor.token });
    assert.equal(pdf.status, 404);
  });

  it('una transición a ENTREGADA no admite un segundo desembolso', async () => {
    const receptor = await session('receptor');
    const response = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: firstRequestId,
        totalDeliveredAmount: 100,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId, amount: 100 }],
      },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /ESTADO_INVALIDO/);
  });

  it('rechaza un total declarado que no coincide con las asignaciones', async () => {
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date desc limit 1',
      [projectId],
    );
    const requestId = await createApprovedRequest(1000, batchId);

    const response = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: requestId,
        totalDeliveredAmount: 900,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId, amount: 600 }],
      },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /TOTAL_DESEMBOLSO_INCONSISTENTE/);
  });

  it('rechaza un beneficiario duplicado en el mismo desembolso', async () => {
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date desc limit 1',
      [projectId],
    );
    const requestId = await createApprovedRequest(1000, batchId);

    const response = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: requestId,
        totalDeliveredAmount: 1000,
        paymentMethod: 'EFECTIVO',
        allocations: [
          { personId, amount: 500 },
          { personId, amount: 500 },
        ],
      },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /BENEFICIARIO_DUPLICADO/);
  });

  it('solo permite desembolsar solicitudes APROBADAS', async () => {
    const generador = await session('generador');
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date desc limit 1',
      [projectId],
    );

    const draft = await api<RequestRow>('/payment-requests', {
      method: 'POST',
      token: generador.token,
      body: { projectId, causationBatchId: batchId, requestedAmount: 1000 },
    });
    assert.equal(draft.status, 201, draft.text);
    draftRequestId = draft.body.id;

    const response = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: draftRequestId,
        totalDeliveredAmount: 100,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId, amount: 100 }],
      },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /ESTADO_INVALIDO/);
  });

  it('aplica FIFO: primero cubre la deuda más antigua y luego el siguiente período', async () => {
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date desc limit 1',
      [projectId],
    );

    secondRequestId = await createApprovedRequest(1000, batchId);

    const response = await api<DisbursementResponse>('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: secondRequestId,
        totalDeliveredAmount: 1000,
        paymentMethod: 'ZELLE',
        referenceNumber: 'ZELLE-INTEGRACION-002',
        allocations: [{ personId, amount: 1000 }],
      },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.receipts.length, 1);

    const receipt = response.body.receipts[0];
    secondReceiptNumber = receipt.receiptNumber;
    assert.equal(Number(receipt.remainingDebtAfterUSD), 400);

    const allocations = await sql<
      Array<{ allocated: string; before: string; after: string }>
    >`select allocated_amount_usd as allocated, debt_before_allocation_usd as before,
             debt_after_allocation_usd as after
      from receipt_allocations where receipt_id = ${receipt.id}
      order by debt_before_allocation_usd desc`;
    assert.equal(allocations.length, 2);

    const january = allocations.find((row) => Number(row.before) === 400);
    const february = allocations.find((row) => Number(row.before) === 1000);
    assert.ok(january, 'Debe imputarse primero la deuda de enero');
    assert.equal(Number(january?.allocated), 400);
    assert.equal(Number(january?.after), 0);
    assert.ok(february, 'El remanente debe imputarse a febrero');
    assert.equal(Number(february?.allocated), 600);
    assert.equal(Number(february?.after), 400);
  });

  it('deja en PAGADO_TOTAL los ítems saldados y en PAGADO_PARCIAL el resto', async () => {
    const statuses = await sql<Array<{ period: string; status: string; remaining: string }>>`
      select period_start_date::text as period, status, remaining_debt as remaining
      from causation_items where person_id = ${personId}
      order by period_start_date`;
    assert.equal(statuses.length, 2);
    assert.equal(statuses[0].status, 'PAGADO_TOTAL');
    assert.equal(Number(statuses[0].remaining), 0);
    assert.equal(statuses[1].status, 'PAGADO_PARCIAL');
    assert.equal(Number(statuses[1].remaining), 400);
  });

  it('numera los recibos de forma correlativa y sin huecos', async () => {
    const firstSequence = Number(firstReceiptNumber.split('-')[2]);
    const secondSequence = Number(secondReceiptNumber.split('-')[2]);
    assert.equal(secondSequence, firstSequence + 1, 'Los recibos deben ser consecutivos');

    const stored = await scalar<number>(
      'select count(*)::int from receipts where receipt_number in ($1, $2)',
      [firstReceiptNumber, secondReceiptNumber],
    );
    assert.equal(stored, 2);
  });

  it('rechaza un desembolso que supera la deuda pendiente total sin dejar rastro', async () => {
    const receptor = await session('receptor');
    const batchId = await scalar<string>(
      'select id from causation_batches where project_id = $1 order by period_start_date desc limit 1',
      [projectId],
    );

    overpayRequestId = await createApprovedRequest(1000, batchId);

    const receiptsBefore = await scalar<number>(
      'select count(*)::int from receipts where person_id = $1',
      [personId],
    );

    const response = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: overpayRequestId,
        totalDeliveredAmount: 1000,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId, amount: 1000 }],
      },
    });
    assert.equal(response.status, 409, response.text);
    assert.match(response.text, /PAGO_EXCEDE_DEUDA/);

    const stillApproved = await scalar<string>(
      'select status from payment_requests where id = $1',
      [overpayRequestId],
    );
    assert.equal(stillApproved, 'APROBADA', 'El rollback no debe cambiar el estado');

    const receiptsAfter = await scalar<number>(
      'select count(*)::int from receipts where person_id = $1',
      [personId],
    );
    assert.equal(receiptsAfter, receiptsBefore, 'El rechazo no debe emitir recibos');
  });

  it('cierra una solicitud ENTREGADA y no permite reabrirla', async () => {
    const receptor = await session('receptor');
    const closed = await api<RequestRow>(`/payment-requests/${firstRequestId}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(closed.status, 200, closed.text);
    assert.equal(closed.body.status, 'CERRADA');

    const again = await api(`/payment-requests/${firstRequestId}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(again.status, 409);
    assert.match(again.text, /TRANSICION_ESTADO_INVALIDA/);
  });

  it('valida el cuerpo del desembolso (método, monto y beneficiarios)', async () => {
    const receptor = await session('receptor');
    const invalidMethod = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: draftRequestId,
        totalDeliveredAmount: 100,
        paymentMethod: 'BITCOIN',
        allocations: [{ personId, amount: 100 }],
      },
    });
    assert.equal(invalidMethod.status, 400);

    const noAllocations = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        paymentRequestId: draftRequestId,
        totalDeliveredAmount: 100,
        paymentMethod: 'EFECTIVO',
        allocations: [],
      },
    });
    assert.equal(noAllocations.status, 400);

    const withoutRequest = await api('/disbursements', {
      method: 'POST',
      token: receptor.token,
      body: {
        totalDeliveredAmount: 100,
        paymentMethod: 'EFECTIVO',
        allocations: [{ personId, amount: 100 }],
      },
    });
    assert.equal(withoutRequest.status, 409);
    assert.match(withoutRequest.text, /ID_SOLICITUD_REQUERIDO/);
  });
});
