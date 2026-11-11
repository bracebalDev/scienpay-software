import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase, scalar, sql } from '../helpers/db.js';

/**
 * HANDOFF 4.3 — Test de concurrencia FIFO.
 *
 * Lanza 20 desembolsos concurrentes (`Promise.all`) para el mismo `personId` y
 * `projectId` en 10 corridas independientes y verifica por SQL que la
 * serialización con `FOR UPDATE` mantiene la integridad financiera:
 *
 *   - suma de `receipt_allocations` = suma desembolsada
 *   - `paid_amount <= calculated_amount`
 *   - `remaining_debt = calculated_amount - paid_amount`
 *   - ningún `remaining_debt` negativo
 *   - cero errores `40P01` (deadlock)
 *   - el test completo termina en menos de 60 s
 *
 * Cada corrida usa una persona distinta con dos períodos causados de $500, de
 * modo que la deuda FIFO es $1.000 y los 20 desembolsos suman $950. Cada
 * desembolso se apoya en una solicitud APROBADA propia (la primera entrega la
 * pasa a ENTREGADA y no admite una segunda).
 */

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();
const RUNS = 10;
const CONCURRENCY = 20;
const AMOUNT_PER_PERIOD = 500;
const DEBT_PER_PERSON = AMOUNT_PER_PERIOD * 2;
const TOTAL_PER_RUN_CENTS = 95_000; // $950,00: deja $50 de deuda pendiente.

let projectId = '';
let groupId = '';
const personIds: string[] = [];
let generadorId = '';
let receptorId = '';
let firstBatchId = '';

interface RequestRow {
  id: string;
  requestCode: string;
  status: string;
}

interface DisbursementResponse {
  message: string;
  disbursement: { id: string; totalAmount: string };
  receipts: Array<{ id: string; receiptNumber: string; remainingDebtAfterUSD: string }>;
}

/** Reparte `totalCents` en `parts` enteros positivos aleatorios que suman el total. */
function randomCentsSplit(totalCents: number, parts: number): number[] {
  const cuts = new Set<number>();
  while (cuts.size < parts - 1) {
    cuts.add(1 + Math.floor(Math.random() * (totalCents - 1)));
  }
  const points = [0, ...[...cuts].sort((a, b) => a - b), totalCents];
  return points.slice(1).map((point, index) => point - points[index]);
}

async function createApprovedRequests(
  personId: string,
  run: number,
  amountsCents: number[],
): Promise<RequestRow[]> {
  const created: RequestRow[] = [];
  for (const [index, cents] of amountsCents.entries()) {
    const requestCode = `CONC-${suffix}-${String(run).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    const [row] = await sql<RequestRow[]>`
      insert into payment_requests (
        request_code, project_id, causation_batch_id, period_description,
        total_amount_usd, status, created_by_user_id, reviewed_by_user_id, reviewed_at
      ) values (
        ${requestCode}, ${projectId}, ${firstBatchId}, ${`Concurrencia FIFO ${personId.slice(0, 8)}`},
        ${(cents / 100).toFixed(2)}, 'APROBADA', ${generadorId}, ${receptorId}, now()
      )
      returning id, request_code as "requestCode", status
    `;
    created.push(row);
  }
  return created;
}

describe('Integración — Concurrencia FIFO: 20 desembolsos simultáneos x 10 corridas', () => {
  it('prepara proyecto, grupo, 10 personas con dos períodos causados', async () => {
    const generador = await session('generador');
    const receptor = await session('receptor');
    generadorId = generador.user.id;
    receptorId = receptor.user.id;

    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      token: generador.token,
      body: {
        code: `FIF${suffix}`,
        name: `Proyecto concurrencia ${suffix}`,
        area: 'BIOLOGIA',
        scope: 'INTERNO',
        startDate: '2025-01-01',
      },
    });
    assert.equal(project.status, 201, project.text);
    projectId = project.body.id;

    const group = await api<{ id: string }>('/payment-groups', {
      method: 'POST',
      token: generador.token,
      body: { name: `Grupo concurrencia ${suffix}`, periodicity: 'MENSUAL' },
    });
    assert.equal(group.status, 201, group.text);
    groupId = group.body.id;

    for (let index = 0; index < RUNS; index += 1) {
      const person = await api<{ id: string }>('/persons', {
        method: 'POST',
        token: generador.token,
        body: {
          documentNumber: `F${suffix}${index}`,
          firstName: `Beneficiario ${index}`,
          lastName: `Concurrencia ${suffix}`,
        },
      });
      assert.equal(person.status, 201, person.text);
      personIds.push(person.body.id);

      const assignment = await api('/assignments', {
        method: 'POST',
        token: generador.token,
        body: {
          personId: person.body.id,
          projectId,
          paymentGroupId: groupId,
          amountPerPeriod: AMOUNT_PER_PERIOD,
          startDate: '2025-01-01',
        },
      });
      assert.equal(assignment.status, 201, assignment.text);
    }

    for (const [start, end] of [
      ['2026-01-01', '2026-01-31'],
      ['2026-02-01', '2026-02-28'],
    ]) {
      const batch = await api<{ batch: { id: string } }>('/causation/generate', {
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
      if (!firstBatchId) firstBatchId = batch.body.batch.id;
    }

    const debt = await scalar<string>(
      `select coalesce(sum(remaining_debt), 0)::numeric(14,2)
         from causation_items where person_id = $1`,
      [personIds[0]],
    );
    assert.equal(Number(debt), DEBT_PER_PERSON, 'Cada persona debe tener dos cuotas de $500');
  });

  for (let run = 1; run <= RUNS; run += 1) {
    it(`corrida ${run}/${RUNS}: 20 desembolsos concurrentes sin sobrepago ni deadlocks`, async () => {
      const receptor = await session('receptor');
      const personId = personIds[run - 1];
      const amountsCents = randomCentsSplit(TOTAL_PER_RUN_CENTS, CONCURRENCY);
      const expectedTotal = TOTAL_PER_RUN_CENTS / 100;
      const requests = await createApprovedRequests(personId, run, amountsCents);

      const startedAt = process.hrtime.bigint();
      const responses = await Promise.all(
        requests.map((request, index) =>
          api<DisbursementResponse>('/disbursements', {
            method: 'POST',
            token: receptor.token,
            body: {
              paymentRequestId: request.id,
              totalDeliveredAmount: amountsCents[index] / 100,
              paymentMethod: 'TRANSFERENCIA',
              referenceNumber: `CONC-${run}-${index + 1}`,
              notes: `Corrida concurrente ${run}`,
              allocations: [{ personId, amount: amountsCents[index] / 100 }],
            },
          }),
        ),
      );
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      const failures = responses.filter((response) => response.status !== 201);
      assert.deepEqual(
        failures.map((response) => `${response.status} ${response.text.slice(0, 200)}`),
        [],
        `Corrida ${run}: todos los desembolsos deben registrarse`,
      );

      const deadlocks = responses.filter((response) =>
        /40P01|deadlock detected/i.test(response.text),
      );
      assert.equal(deadlocks.length, 0, `Corrida ${run}: no debe haber deadlocks`);

      for (const response of responses) {
        assert.equal(response.body.message, 'DESEMBOLSO_REGISTRADO_EXITOSAMENTE');
        assert.equal(response.body.receipts.length, 1, 'Un recibo por persona y desembolso');
      }

      const prefix = `CONC-${suffix}-${String(run).padStart(2, '0')}-%`;

      const disbursed = await scalar<string>(
        `select coalesce(sum(d.total_amount), 0)::numeric(14,2)
           from disbursements d
           join payment_requests pr on pr.id = d.payment_request_id
          where pr.request_code like $1`,
        [prefix],
      );
      assert.equal(Number(disbursed), expectedTotal, `Corrida ${run}: total desembolsado`);

      const receiptTotal = await scalar<string>(
        `select coalesce(sum(r.total_amount_usd), 0)::numeric(14,2)
           from receipts r where r.person_id = $1`,
        [personId],
      );
      assert.equal(Number(receiptTotal), expectedTotal, `Corrida ${run}: total de recibos`);

      const allocationTotal = await scalar<string>(
        `select coalesce(sum(ra.allocated_amount_usd), 0)::numeric(14,2)
           from receipt_allocations ra
           join receipts r on r.id = ra.receipt_id
          where r.person_id = $1`,
        [personId],
      );
      assert.equal(
        Number(allocationTotal),
        Number(receiptTotal),
        `Corrida ${run}: imputaciones y recibos deben cuadrar`,
      );

      const receiptCount = await scalar<number>(
        'select count(*)::int from receipts where person_id = $1',
        [personId],
      );
      assert.equal(receiptCount, CONCURRENCY, `Corrida ${run}: un recibo por desembolso`);

      const inconsistent = await scalar<number>(
        `select count(*)::int
           from causation_items ci
           join causation_batches cb on cb.id = ci.batch_id
          where cb.project_id = $1
            and (ci.paid_amount > ci.calculated_amount
                 or ci.remaining_debt < 0
                 or ci.remaining_debt <> (ci.calculated_amount - ci.paid_amount))`,
        [projectId],
      );
      assert.equal(inconsistent, 0, `Corrida ${run}: invariantes SQL de causación`);

      const pendingDebt = await scalar<string>(
        `select coalesce(sum(remaining_debt), 0)::numeric(14,2)
           from causation_items where person_id = $1`,
        [personId],
      );
      assert.equal(
        Number(pendingDebt),
        DEBT_PER_PERSON - expectedTotal,
        `Corrida ${run}: deuda pendiente esperada`,
      );

      // FIFO: enero se salda completo y febrero conserva el remanente.
      const items = await sql<Array<{ period: string; status: string; remaining: string }>>`
        select period_start_date::text as period, status, remaining_debt as remaining
          from causation_items
         where person_id = ${personId}
         order by period_start_date
      `;
      assert.equal(items.length, 2);
      assert.equal(items[0].status, 'PAGADO_TOTAL', `Corrida ${run}: enero debe quedar saldado`);
      assert.equal(Number(items[0].remaining), 0);
      assert.equal(items[1].status, 'PAGADO_PARCIAL', `Corrida ${run}: febrero parcial`);
      assert.equal(Number(items[1].remaining), DEBT_PER_PERSON - expectedTotal);

      assert.ok(
        elapsedMs < 60_000,
        `Corrida ${run}: los 20 desembolsos tardaron ${elapsedMs.toFixed(0)} ms (máximo 60 s)`,
      );
    });
  }
});
