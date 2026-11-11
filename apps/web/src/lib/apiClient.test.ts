import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiClient,
  ApiError,
  setAccessToken,
  getAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from './apiClient.js';

describe('apiClient — Cliente HTTP Frontend (HANDOFF 3.1 & 4.6.3)', () => {
  beforeEach(() => {
    setAccessToken(null);
    setRefreshHandler(null);
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe gestionar el access token exclusivamente en memoria', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('jwt.test.token');
    expect(getAccessToken()).toBe('jwt.test.token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('debe incluir Bearer token en cabeceras si existe access token', async () => {
    setAccessToken('fake.jwt.token');

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient.get<{ data: string }>('/test');
    expect(result).toEqual({ data: 'ok' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toBe('Bearer fake.jwt.token');
  });

  it('debe normalizar respuestas de error en instancias de ApiError con status y message', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            statusCode: 400,
            message: ['El código es obligatorio', 'El nombre es obligatorio'],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiClient.post('/projects', {})).rejects.toThrow(ApiError);
    await expect(apiClient.post('/projects', {})).rejects.toMatchObject({
      status: 400,
      message: 'El código es obligatorio, El nombre es obligatorio',
    });
  });

  it('debe reintentar la petición una vez si recibe 401 y el refreshHandler es exitoso', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Token expirado' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockRefresh = vi.fn().mockResolvedValue(true);
    setRefreshHandler(mockRefresh);

    const result = await apiClient.get<{ success: boolean }>('/projects');
    expect(result).toEqual({ success: true });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('debe invocar unauthorizedHandler si el refreshHandler falla tras un 401', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const mockRefresh = vi.fn().mockResolvedValue(false);
    const mockUnauthorized = vi.fn();
    setRefreshHandler(mockRefresh);
    setUnauthorizedHandler(mockUnauthorized);

    await expect(apiClient.get('/projects')).rejects.toThrow(ApiError);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('debe descargar blobs con nombre de archivo extraído de Content-Disposition', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(mockBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="REC-2026-000001.pdf"',
        },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const { blob, filename } = await apiClient.download('/disbursements/receipts/1/pdf');
    expect(filename).toBe('REC-2026-000001.pdf');
    expect(blob.type).toBe('application/pdf');
  });
});
