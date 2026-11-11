import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  login,
  session,
  CREDENTIALS,
  BASE_URL,
  RUN_SUFFIX,
} from '../helpers/integration-env.js';
import { closeDatabase, scalar } from '../helpers/db.js';

after(async () => {
  await closeDatabase();
});

interface LoginBody {
  message: string;
  accessToken: string;
  user: { id: string; username: string; email: string; role: string; fullName: string };
}

interface MeBody {
  id: string;
  email: string;
  role: string;
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

describe('Integración — Autenticación y sesión', () => {
  it('GET /health responde 200 con estado ok', async () => {
    const response = await api<{ status: string; service: string; version: string }>('/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.service, 'scienpay-api');
    assert.ok(response.body.version);
  });

  it('GET /auth/me sin token responde 401', async () => {
    const response = await api('/auth/me');
    assert.equal(response.status, 401);
  });

  it('GET /auth/me con token inválido responde 401', async () => {
    const response = await api('/auth/me', { token: 'not-a-jwt' });
    assert.equal(response.status, 401);
  });

  it('login por username devuelve access token y usuario', async () => {
    const response = await api<LoginBody>('/auth/login', {
      method: 'POST',
      body: CREDENTIALS.admin,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.message, 'AUTENTICACION_EXITOSA');
    assert.ok(response.body.accessToken.split('.').length === 3);
    assert.equal(response.body.user.role, 'ADMIN');
    assert.equal(response.body.user.username, 'admin');
    assert.equal(response.body.user.email, 'admin@scienpay.uc.edu.ve');
  });

  it('login por email institucional devuelve 200', async () => {
    const response = await api<LoginBody>('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'generador@scienpay.uc.edu.ve',
        password: CREDENTIALS.generador.password,
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, 'GENERADOR');
  });

  it('login es insensible a mayúsculas en el identificador', async () => {
    const response = await api<LoginBody>('/auth/login', {
      method: 'POST',
      body: { identifier: 'RECEPTOR', password: CREDENTIALS.receptor.password },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, 'receptor');
  });

  it('login con identificador inexistente responde 401 sin filtrar detalles', async () => {
    const response = await api<{ message: string }>('/auth/login', {
      method: 'POST',
      body: { identifier: `nadie-${RUN_SUFFIX}`, password: 'ClaveSegura#2026' },
    });
    assert.equal(response.status, 401);
    assert.match(response.body.message, /CREDENCIALES_INVALIDAS/);
  });

  it('login con payload inválido responde 401 (semántica de credenciales)', async () => {
    const response = await api('/auth/login', {
      method: 'POST',
      body: { password: 'ClaveSegura#2026' },
    });
    assert.equal(response.status, 401);
  });

  it('la cookie de refresh es HttpOnly, SameSite=Strict y acotada a /api/v1/auth', async () => {
    const response = await api('/auth/login', { method: 'POST', body: CREDENTIALS.admin });
    const cookie = response.setCookies.find((value) => value.startsWith('scienpay_refresh='));
    assert.ok(cookie, 'El login debe emitir la cookie scienpay_refresh');
    assert.match(cookie as string, /HttpOnly/i);
    assert.match(cookie as string, /SameSite=Strict/i);
    assert.match(cookie as string, /Path=\/api\/v1\/auth/i);
  });

  it('el access token expira en 15 minutos y lleva el rol', async () => {
    const current = await session('generador');
    const claims = decodeJwt(current.token);
    const exp = Number(claims.exp);
    const iat = Number(claims.iat);
    assert.equal(exp - iat, 15 * 60);
    assert.equal(claims.role, 'GENERADOR');
  });

  it('GET /auth/me devuelve el usuario autenticado', async () => {
    const current = await session('receptor');
    const response = await api<MeBody>('/auth/me', { token: current.token });
    assert.equal(response.status, 200);
    assert.equal(response.body.email, 'receptor@scienpay.uc.edu.ve');
    assert.equal(response.body.role, 'RECEPTOR');
  });

  it('refresh sin cookie responde 401', async () => {
    const response = await api('/auth/refresh', { method: 'POST' });
    assert.equal(response.status, 401);
  });

  it('refresh con cookie válida rota el token y emite uno nuevo', async () => {
    const fresh = await login('admin');
    const response = await api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      cookie: fresh.cookie,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body.accessToken);

    const rotated = response.setCookies.find((value) => value.startsWith('scienpay_refresh='));
    assert.ok(rotated, 'El refresh debe emitir una cookie nueva');
    assert.notEqual(rotated?.split(';')[0], fresh.cookie);
  });

  it('reutilizar un refresh ya rotado responde 401 y revoca la familia', async () => {
    const original = await login('generador');
    const rotatedResponse = await api('/auth/refresh', {
      method: 'POST',
      cookie: original.cookie,
    });
    assert.equal(rotatedResponse.status, 200);
    const rotatedCookie =
      rotatedResponse.setCookies
        .find((value) => value.startsWith('scienpay_refresh='))
        ?.split(';')[0] ?? '';

    const replay = await api('/auth/refresh', { method: 'POST', cookie: original.cookie });
    assert.equal(replay.status, 401);
    assert.match(replay.text, /TOKEN_REPLAY_DETECTADO|REFRESH_TOKEN_/);

    const afterReplay = await api('/auth/refresh', { method: 'POST', cookie: rotatedCookie });
    assert.equal(afterReplay.status, 401, 'La familia completa debe quedar revocada');
  });

  it('logout revoca el refresh vigente', async () => {
    const fresh = await login('receptor');
    const logout = await api('/auth/logout', { method: 'POST', cookie: fresh.cookie });
    assert.ok([200, 204].includes(logout.status));

    const refresh = await api('/auth/refresh', { method: 'POST', cookie: fresh.cookie });
    assert.equal(refresh.status, 401);
  });

  it('el refresh no se acepta como access token', async () => {
    const fresh = await login('admin');
    const response = await api('/auth/me', { token: fresh.cookie.split('=')[1] ?? '' });
    assert.equal(response.status, 401);
  });

  it('los refresh tokens activos se guardan hasheados en la base', async () => {
    const fresh = await login('admin');
    const rawToken = fresh.cookie.split('=')[1] ?? '';
    const stored = await scalar<number>(
      'select count(*)::int as total from refresh_tokens where token_hash = $1',
      [rawToken],
    );
    assert.equal(stored, 0, 'El token en claro no debe estar en la base');

    const hashed = await scalar<number>('select count(*)::int as total from refresh_tokens');
    assert.ok((hashed ?? 0) > 0);
  });

  it('la contraseña nunca aparece en la respuesta de login', async () => {
    const response = await api('/auth/login', { method: 'POST', body: CREDENTIALS.admin });
    assert.equal(response.status, 200);
    assert.doesNotMatch(response.text, /password/i);
    assert.doesNotMatch(response.text, /Admin#Scienpay2026/);
  });

  it('un login fallido incrementa el contador de intentos del usuario', async () => {
    const admin = await session('admin');
    const email = `qa-${RUN_SUFFIX}@scienpay.test`;
    const password = 'QaPassword#2026';

    const created = await api<{ id: string }>('/users', {
      method: 'POST',
      token: admin.token,
      body: { email, fullName: 'Usuario QA', role: 'RECEPTOR', password },
    });
    assert.equal(created.status, 201, created.text);

    const failed = await api('/auth/login', {
      method: 'POST',
      body: { identifier: email, password: 'ClaveIncorrecta#2026' },
    });
    assert.equal(failed.status, 401);

    const attempts = await scalar<number>('select failed_attempts from users where email = $1', [
      email,
    ]);
    assert.equal(attempts, 1);

    await api(`/users/${created.body.id}/reset-attempts`, {
      method: 'PATCH',
      token: admin.token,
    });
    const reset = await scalar<number>('select failed_attempts from users where email = $1', [
      email,
    ]);
    assert.equal(reset, 0);
  });

  it('el usuario recién creado puede iniciar sesión', async () => {
    const email = `qa-${RUN_SUFFIX}-b@scienpay.test`;
    const admin = await session('admin');
    const created = await api('/users', {
      method: 'POST',
      token: admin.token,
      body: { email, fullName: 'Usuario QA B', role: 'GENERADOR', password: 'QaPassword#2027' },
    });
    assert.equal(created.status, 201, created.text);

    const loginResponse = await api<LoginBody>('/auth/login', {
      method: 'POST',
      body: { identifier: email, password: 'QaPassword#2027' },
    });
    assert.equal(loginResponse.status, 200);
    assert.equal(loginResponse.body.user.role, 'GENERADOR');
  });

  it('el identificador se normaliza a minúsculas al buscar por email', async () => {
    const response = await api<LoginBody>('/auth/login', {
      method: 'POST',
      baseUrl: BASE_URL,
      body: { identifier: 'ADMIN@SCIENPAY.UC.EDU.VE', password: CREDENTIALS.admin.password },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.username, 'admin');
  });

  it('un password por debajo de la longitud mínima responde 401 de formato', async () => {
    const response = await api('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin', password: 'corta' },
    });
    assert.equal(response.status, 401);
    assert.match(response.text, /DATOS_INVALIDOS/);
  });

  it('solo ADMIN reinicia los intentos fallidos de un usuario', async () => {
    const generador = await session('generador');
    const response = await api(`/users/${generador.user.id}/reset-attempts`, {
      method: 'PATCH',
      token: generador.token,
    });
    assert.equal(response.status, 403);
  });
});
