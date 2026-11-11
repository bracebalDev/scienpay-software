import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase, scalar, sql } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();

let projectId = '';
let foreignProjectId = '';
let pettyCashId = '';
let periodMarchId = '';
let periodAprilId = '';
let firstVoucherId = '';
let aVoucherNumber = '';
let bVoucherNumber = '';

interface VoucherRow {
  id: string;
  voucherNumber: string;
  status: string;
  requestedAmount: string;
  renderedAmount: string | null;
  changeAmount: string | null;
}

interface PeriodRow {
  id: string;
  periodYear: number;
  periodMonth: number;
  openingBalance: string;
  closingBalance: string;
  disbursedTotal: string;
  renderedTotal: string;
  status: string;
}

async function requestVoucher(periodId: string, amount: number, purpose: string) {
  const generador = await session('generador');
  const response = await api<VoucherRow>(`/petty-cash/periods/${periodId}/vouchers`, {
    method: 'POST',
    token: generador.token,
    body: { projectId, requestedAmount: amount, purpose },
  });
  assert.equal(response.status, 201, response.text);
  return response.body;
}

async function approveVoucher(voucherId: string) {
  const receptor = await session('receptor');
  const response = await api<VoucherRow>(`/petty-cash/vouchers/${voucherId}/approve`, {
    method: 'PATCH',
    token: receptor.token,
  });
  assert.equal(response.status, 200, response.text);
  return response.body;
}

async function getPeriod(periodId: string): Promise<PeriodRow> {
  const receptor = await session('receptor');
  const response = await api<PeriodRow[]>(`/petty-cash/${pettyCashId}/periods`, {
    token: receptor.token,
  });
  assert.equal(response.status, 200);
  const period = response.body.find((row) => row.id === periodId);
  assert.ok(period, 'El período debe existir');
  return period;
}

describe('Integración — Caja chica: períodos, vales, rendición, cierre y arrastre', () => {
  it('prepara dos proyectos y crea la caja chica', async () => {
    const generador = await session('generador');
    const receptor = await session('receptor');

    for (const [code, name] of [
      [`PC${suffix}`, `Proyecto caja ${suffix}`],
      [`PCX${suffix}`, `Proyecto ajeno ${suffix}`],
    ]) {
      const project = await api<{ id: string }>('/projects', {
        method: 'POST',
        token: generador.token,
        body: { code, name, area: 'FISICA', scope: 'INTERNO', startDate: '2025-01-01' },
      });
      assert.equal(project.status, 201, project.text);
      if (code.startsWith('PCX')) foreignProjectId = project.body.id;
      else projectId = project.body.id;
    }

    const cash = await api<{ id: string; status: string; custodianName: string }>('/petty-cash', {
      method: 'POST',
      token: receptor.token,
      body: {
        name: `Caja integración ${suffix}`,
        description: 'Caja creada por la suite',
        custodianName: 'Lic. Custodio Integración',
        projectIds: [projectId],
      },
    });
    assert.equal(cash.status, 201, cash.text);
    assert.equal(cash.body.status, 'ACTIVA');
    pettyCashId = cash.body.id;
  });

  it('lista las cajas chicas e incluye la creada', async () => {
    const receptor = await session('receptor');
    const response = await api<Array<{ id: string; name: string }>>('/petty-cash', {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.some((cash) => cash.id === pettyCashId));
  });

  it('rechaza crear una caja con proyectos inexistentes', async () => {
    const receptor = await session('receptor');
    const response = await api<{ message: string }>('/petty-cash', {
      method: 'POST',
      token: receptor.token,
      body: {
        name: 'Caja fantasma',
        custodianName: 'Nadie',
        projectIds: ['88888888-8888-4888-8888-888888888888'],
      },
    });
    assert.equal(response.status, 404);
    assert.match(response.text, /PROYECTO_NO_ENCONTRADO/);
  });

  it('abre el período de marzo con saldo inicial', async () => {
    const receptor = await session('receptor');
    const response = await api<PeriodRow>(`/petty-cash/${pettyCashId}/periods`, {
      method: 'POST',
      token: receptor.token,
      body: { periodYear: 2026, periodMonth: 3, openingBalance: 1000 },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.body.status, 'ABIERTO');
    assert.equal(Number(response.body.openingBalance), 1000);
    assert.equal(Number(response.body.closingBalance), 1000);
    assert.equal(Number(response.body.disbursedTotal), 0);
    periodMarchId = response.body.id;
  });

  it('rechaza abrir dos veces el mismo período', async () => {
    const receptor = await session('receptor');
    const response = await api(`/petty-cash/${pettyCashId}/periods`, {
      method: 'POST',
      token: receptor.token,
      body: { periodYear: 2026, periodMonth: 3, openingBalance: 500 },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /PERIODO_EXISTENTE/);
  });

  it('rechaza abrir un período nuevo si el anterior sigue abierto', async () => {
    const receptor = await session('receptor');
    const response = await api(`/petty-cash/${pettyCashId}/periods`, {
      method: 'POST',
      token: receptor.token,
      body: { periodYear: 2026, periodMonth: 4, openingBalance: 1000 },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /PERIODO_PREVIO_ABIERTO/);
  });

  it('lista los períodos de la caja y valida la caja inexistente', async () => {
    const receptor = await session('receptor');
    const response = await api<PeriodRow[]>(`/petty-cash/${pettyCashId}/periods`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].id, periodMarchId);

    const missing = await api('/petty-cash/99999999-9999-4999-8999-999999999999/periods', {
      token: receptor.token,
    });
    assert.equal(missing.status, 404);
    assert.match(missing.text, /CAJA_NO_ENCONTRADA/);
  });

  it('emite un vale SOLICITADO con numeración VAL-YYYY-NNNN', async () => {
    const voucher = await requestVoucher(periodMarchId, 300, 'Compra de reactivos de laboratorio');
    assert.equal(voucher.status, 'SOLICITADO');
    assert.match(voucher.voucherNumber, /^VAL-2026-\d{4}$/, voucher.voucherNumber);
    assert.equal(Number(voucher.requestedAmount), 300);
    firstVoucherId = voucher.id;
    aVoucherNumber = voucher.voucherNumber;
  });

  it('rechaza un vale para un proyecto no asociado a la caja', async () => {
    const generador = await session('generador');
    const response = await api(`/petty-cash/periods/${periodMarchId}/vouchers`, {
      method: 'POST',
      token: generador.token,
      body: {
        projectId: foreignProjectId,
        requestedAmount: 50,
        purpose: 'Intento con proyecto no asociado a la caja',
      },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /PROYECTO_NO_ASOCIADO/);
  });

  it('rechaza un vale con concepto demasiado corto', async () => {
    const generador = await session('generador');
    const response = await api(`/petty-cash/periods/${periodMarchId}/vouchers`, {
      method: 'POST',
      token: generador.token,
      body: { projectId, requestedAmount: 50, purpose: 'corto' },
    });
    assert.equal(response.status, 400);
  });

  it('lista los vales del período', async () => {
    const receptor = await session('receptor');
    const response = await api<VoucherRow[]>(`/petty-cash/periods/${periodMarchId}/vouchers`, {
      token: receptor.token,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].id, firstVoucherId);
  });

  it('solo el receptor aprueba vales', async () => {
    const generador = await session('generador');
    const forbidden = await api(`/petty-cash/vouchers/${firstVoucherId}/approve`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(forbidden.status, 403);

    const approved = await approveVoucher(firstVoucherId);
    assert.equal(approved.status, 'APROBADO');
  });

  it('desembolsa el vale y descuenta el saldo del período', async () => {
    const receptor = await session('receptor');
    const response = await api<VoucherRow>(`/petty-cash/vouchers/${firstVoucherId}/disburse`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'DESEMBOLSADO');

    const period = await getPeriod(periodMarchId);
    assert.equal(Number(period.closingBalance), 700);
    assert.equal(Number(period.disbursedTotal), 300);
  });

  it('no permite desembolsar dos veces el mismo vale', async () => {
    const receptor = await session('receptor');
    const response = await api(`/petty-cash/vouchers/${firstVoucherId}/disburse`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /ESTADO_INVALIDO/);
  });

  it('rechaza una rendición descuadrada', async () => {
    const receptor = await session('receptor');
    const response = await api(`/petty-cash/vouchers/${firstVoucherId}/render`, {
      method: 'PATCH',
      token: receptor.token,
      body: { renderedAmount: 250, changeAmount: 0, invoiceReference: 'FAC-001' },
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /RENDICION_DESCUADRADA/);
  });

  it('rinde el vale con vuelto y devuelve el cambio al saldo', async () => {
    const receptor = await session('receptor');
    const response = await api<VoucherRow>(`/petty-cash/vouchers/${firstVoucherId}/render`, {
      method: 'PATCH',
      token: receptor.token,
      body: {
        renderedAmount: 250,
        changeAmount: 50,
        invoiceReference: 'FAC-INTEGRACION-001',
        voucherDocumentUrl: 'https://docs.scienpay.test/fac-001.pdf',
      },
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'RENDIDO');
    assert.equal(Number(response.body.renderedAmount), 250);
    assert.equal(Number(response.body.changeAmount), 50);

    const period = await getPeriod(periodMarchId);
    assert.equal(Number(period.closingBalance), 750);
    assert.equal(Number(period.renderedTotal), 250);
  });

  it('registra los movimientos inmutables de apertura, desembolso y devolución', async () => {
    const movements = await sql<Array<{ movement_type: string; amount: string }>>`
      select movement_type, amount from petty_cash_movements
      where petty_cash_period_id = ${periodMarchId}
      order by created_at`;
    const types = movements.map((row) => row.movement_type);
    assert.deepEqual(types, ['APERTURA_ARRASTRE', 'DESEMBOLSO_VALE', 'DEVOLUCION_CAMBIO']);
    assert.equal(Number(movements[1].amount), 300);
    assert.equal(Number(movements[2].amount), 50);
  });

  it('cierra el período sin vales pendientes', async () => {
    const receptor = await session('receptor');
    const response = await api<PeriodRow>(`/petty-cash/periods/${periodMarchId}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.body.status, 'CERRADO');
    assert.equal(Number(response.body.closingBalance), 750);
  });

  it('abre abril arrastrando el saldo de cierre de marzo', async () => {
    const receptor = await session('receptor');
    const response = await api<PeriodRow>(`/petty-cash/${pettyCashId}/periods`, {
      method: 'POST',
      token: receptor.token,
      body: { periodYear: 2026, periodMonth: 4, openingBalance: 999999 },
    });
    assert.equal(response.status, 201, response.text);
    assert.equal(
      Number(response.body.openingBalance),
      750,
      'El arrastre manda sobre el saldo enviado',
    );
    assert.equal(Number(response.body.closingBalance), 750);
    periodAprilId = response.body.id;
  });

  it('rechaza desembolsar un vale que supera el saldo disponible', async () => {
    const receptor = await session('receptor');
    const voucher = await requestVoucher(
      periodAprilId,
      2000,
      'Compra mayor a la disponibilidad de la caja',
    );
    bVoucherNumber = voucher.voucherNumber;
    await approveVoucher(voucher.id);

    const response = await api(`/petty-cash/vouchers/${voucher.id}/disburse`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /FONDOS_INSUFICIENTES/);
  });

  it('numera los vales de forma ascendente y sin repetir', async () => {
    const a = Number(aVoucherNumber.split('-')[2]);
    const b = Number(bVoucherNumber.split('-')[2]);
    assert.ok(b > a, `${aVoucherNumber} debe ser anterior a ${bVoucherNumber}`);
  });

  it('no cierra un período con vales pendientes', async () => {
    const receptor = await session('receptor');
    const response = await api(`/petty-cash/periods/${periodAprilId}/close`, {
      method: 'PATCH',
      token: receptor.token,
    });
    assert.equal(response.status, 409);
    assert.match(response.text, /VALES_PENDIENTES/);
  });

  it('rechaza operar sobre un período inexistente', async () => {
    const generador = await session('generador');
    const response = await api(
      '/petty-cash/periods/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/vouchers',
      {
        method: 'POST',
        token: generador.token,
        body: { projectId, requestedAmount: 10, purpose: 'Concepto suficientemente largo' },
      },
    );
    assert.equal(response.status, 404);
    assert.match(response.text, /PERIODO_NO_ENCONTRADO/);
  });

  it('el saldo persistido coincide con apertura menos lo rendido', async () => {
    const balance = await scalar<string>(
      `select (opening_balance - rendered_total)::numeric(14,2) from petty_cash_periods where id = $1`,
      [periodMarchId],
    );
    assert.equal(Number(balance), 750);
  });
});
