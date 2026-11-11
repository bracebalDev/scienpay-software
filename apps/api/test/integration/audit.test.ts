import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, RUN_SUFFIX, session } from '../helpers/integration-env.js';
import { closeDatabase, scalar } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

const suffix = RUN_SUFFIX.slice(-6).toUpperCase();

interface AuditRow {
  id: string;
  userId: string | null;
  userEmail: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

interface AuditPage {
  data: AuditRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function query(params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `/audit?${search.toString()}`;
}

describe('Integración — Auditoría: filtros, paginación y acceso restringido', () => {
  it('el seed deja eventos de auditoría consultables', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>('/audit', { token: admin.token });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.data));
    assert.ok(response.body.total >= 2, 'El seed registra inicialización y desembolso');
    assert.equal(response.body.page, 1);
    assert.equal(response.body.limit, 50);
    assert.equal(response.body.totalPages, Math.ceil(response.body.total / 50));
  });

  it('ordena los eventos del más reciente al más antiguo', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ limit: 20 }), { token: admin.token });
    assert.equal(response.status, 200);
    const timestamps = response.body.data.map((row) => new Date(row.createdAt).getTime());
    for (let index = 1; index < timestamps.length; index += 1) {
      assert.ok(
        timestamps[index - 1] >= timestamps[index],
        'El registro de auditoría se ordena por createdAt descendente',
      );
    }
  });

  it('filtra por acción', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ action: 'SISTEMA_INICIALIZADO' }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.total >= 1);
    assert.ok(response.body.data.every((row) => row.action === 'SISTEMA_INICIALIZADO'));
  });

  it('filtra por entidad', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ entity: 'system_parameters' }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.total >= 1);
    assert.ok(response.body.data.every((row) => row.entity === 'system_parameters'));
  });

  it('combina filtros de acción y entidad', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(
      query({ action: 'DESEMBOLSO_REGISTRADO', entity: 'disbursements' }),
      { token: admin.token },
    );
    assert.equal(response.status, 200);
    assert.ok(response.body.total >= 1);
    assert.ok(
      response.body.data.every(
        (row) => row.action === 'DESEMBOLSO_REGISTRADO' && row.entity === 'disbursements',
      ),
    );
  });

  it('filtra por usuario', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ userId: admin.user.id }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.every((row) => row.userId === admin.user.id));
  });

  it('filtra por rango de fechas que incluye al evento sembrado', async () => {
    const admin = await session('admin');
    const eventDate = await scalar<string>(
      `select to_char(max(created_at) at time zone 'UTC', 'YYYY-MM-DD')
       from audit_log where action = 'SISTEMA_INICIALIZADO'`,
    );
    assert.ok(eventDate, 'Debe existir el evento de inicialización');

    const response = await api<AuditPage>(query({ dateFrom: eventDate, dateTo: eventDate }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.total >= 1);
    assert.ok(
      response.body.data.some((row) => row.action === 'SISTEMA_INICIALIZADO'),
      `Sin evento en el rango ${eventDate}`,
    );
  });

  it('un rango de fechas sin eventos devuelve una página vacía', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ dateFrom: '2000-01-01', dateTo: '2000-01-02' }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.total, 0);
    assert.deepEqual(response.body.data, []);
    assert.equal(response.body.totalPages, 0);
  });

  it('pagina con limit y page y no repite filas entre páginas', async () => {
    const admin = await session('admin');
    const first = await api<AuditPage>(query({ page: 1, limit: 1 }), { token: admin.token });
    const second = await api<AuditPage>(query({ page: 2, limit: 1 }), { token: admin.token });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.ok(first.body.data.length <= 1);
    assert.equal(first.body.page, 1);
    assert.equal(second.body.page, 2);
    assert.equal(first.body.limit, 1);
    if (first.body.total > 1) {
      assert.notEqual(first.body.data[0]?.id, second.body.data[0]?.id);
    }
  });

  it('una página posterior a la última devuelve datos vacíos y conserva el total', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ page: 999, limit: 50 }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
    assert.ok(response.body.total >= 0);
  });

  it('acepta el límite máximo de 200 registros', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ limit: 200 }), { token: admin.token });
    assert.equal(response.status, 200);
    assert.equal(response.body.limit, 200);
    assert.ok(response.body.data.length <= 200);
  });

  it('rechaza limit fuera del rango permitido', async () => {
    const admin = await session('admin');
    for (const limit of [0, 201]) {
      const response = await api(query({ limit }), { token: admin.token });
      assert.equal(response.status, 400, `limit=${limit} debería ser 400`);
      assert.match(response.text, /DATOS_INVALIDOS/);
    }
  });

  it('rechaza page menor a 1', async () => {
    const admin = await session('admin');
    const response = await api(query({ page: 0 }), { token: admin.token });
    assert.equal(response.status, 400);
  });

  it('rechaza un rango de fechas invertido', async () => {
    const admin = await session('admin');
    const response = await api(query({ dateFrom: '2026-05-10', dateTo: '2026-05-01' }), {
      token: admin.token,
    });
    assert.equal(response.status, 400);
  });

  it('rechaza formatos de fecha inválidos', async () => {
    const admin = await session('admin');
    const response = await api(query({ dateFrom: '10/05/2026' }), { token: admin.token });
    assert.equal(response.status, 400);
  });

  it('rechaza un userId que no es UUID', async () => {
    const admin = await session('admin');
    const response = await api(query({ userId: `usuario-${suffix}` }), { token: admin.token });
    assert.equal(response.status, 400);
    assert.match(response.text, /DATOS_INVALIDOS/);
  });

  it('solo el ADMIN accede al registro de auditoría', async () => {
    for (const role of ['generador', 'receptor'] as const) {
      const current = await session(role);
      const response = await api('/audit', { token: current.token });
      assert.equal(response.status, 403, `${role} no debe acceder a la auditoría`);
    }
  });

  it('sin token responde 401', async () => {
    const response = await api('/audit');
    assert.equal(response.status, 401);
  });

  it('el total filtrado es consistente con una consulta SQL directa', async () => {
    const admin = await session('admin');
    const response = await api<AuditPage>(query({ action: 'SISTEMA_INICIALIZADO' }), {
      token: admin.token,
    });
    assert.equal(response.status, 200);
    const expected = await scalar<number>(
      `select count(*)::int from audit_log where action = 'SISTEMA_INICIALIZADO'`,
    );
    assert.equal(response.body.total, expected);
  });
});
