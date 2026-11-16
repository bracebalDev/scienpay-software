import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  getAccessToken,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from './apiClient.js';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiClient', () => {
  beforeEach(() => {
    setAccessToken(null);
    setRefreshHandler(null);
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('antepone /api/v1, envía credenciales y el token en memoria', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('access-123');

    await expect(apiClient.post('/projects', { name: 'Proyecto' })).resolves.toEqual({
      ok: true,
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/projects');
    expect(options.credentials).toBe('include');
    expect(options.method).toBe('POST');
    expect(options.headers.get('Authorization')).toBe('Bearer access-123');
    expect(options.body).toBe(JSON.stringify({ name: 'Proyecto' }));
  });

  it('renueva la sesión y reintenta una vez tras un 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expirado' }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }));
    vi.stubGlobal('fetch', fetchMock);
    const refresh = vi.fn().mockResolvedValue(true);
    setRefreshHandler(refresh);

    await expect(apiClient.get('/persons')).resolves.toEqual({ id: '1' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('no reintenta ni refresca en endpoints de autenticación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'no' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const refresh = vi.fn().mockResolvedValue(true);
    setRefreshHandler(refresh);

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('normaliza el mensaje de error del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ message: ['A', 'B'], details: { field: 'x' } }, 400)),
    );

    await expect(apiClient.get('/x')).rejects.toMatchObject({
      status: 400,
      message: 'A, B',
      details: { field: 'x' },
    });
  });

  it('conserva el token solo en memoria', () => {
    setAccessToken('abc');
    expect(getAccessToken()).toBe('abc');
    expect(window.localStorage ? window.localStorage.getItem('accessToken') : null).toBeNull();
    expect(window.sessionStorage ? window.sessionStorage.getItem('accessToken') : null).toBeNull();
  });
});
