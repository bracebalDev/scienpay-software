/**
 * Cliente HTTP único del frontend (HANDOFF 3.1).
 *
 * Decisiones:
 * - El access token vive solo en memoria; nunca en localStorage.
 * - El refresh token viaja en cookie HttpOnly (`credentials: 'include'`).
 * - Ante 401 en endpoints protegidos se intenta un refresh y se reintenta una vez.
 * - Los errores del backend se normalizan a `ApiError` con `status`, mensaje y detalle.
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registra la función que intenta renovar la sesión ante un 401. */
export function setRefreshHandler(handler: (() => Promise<boolean>) | null): void {
  refreshHandler = handler;
}

/** Registra la función que limpia la sesión cuando el refresh ya no es posible. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `ERROR_HTTP_${response.status}`;
  let details: unknown;

  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      details?: unknown;
      errors?: unknown;
    };
    if (Array.isArray(payload.message)) {
      message = payload.message.join(', ');
    } else if (payload.message) {
      message = payload.message;
    }
    details = payload.details ?? payload.errors;
  } catch {
    // Respuesta sin cuerpo JSON: se conserva el mensaje genérico.
  }

  return new ApiError(response.status, message, details);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  allowRetry = true,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && allowRetry && !path.startsWith('/auth/')) {
    if (refreshHandler && (await refreshHandler())) {
      return request<T>(path, options, false);
    }
    unauthorizedHandler?.();
  } else if (response.status === 401 && !allowRetry) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

async function download(
  path: string,
  allowRetry = true,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: buildHeaders({}),
    credentials: 'include',
  });

  if (response.status === 401 && allowRetry && !path.startsWith('/auth/')) {
    if (refreshHandler && (await refreshHandler())) {
      return download(path, false);
    }
    unauthorizedHandler?.();
  } else if (response.status === 401 && !allowRetry) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? 'documento.pdf',
  };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download,
};

/** Extrae un mensaje legible de cualquier error lanzado por el cliente. */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado';
}

/** Dispara la descarga de un blob en el navegador. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
