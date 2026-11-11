/**
 * Utilidades compartidas por la suite de integración (HANDOFF 4.1).
 *
 * La suite corre contra una API real levantada por
 * `apps/api/scripts/run-integration.mjs`, apuntando a un PostgreSQL 16 aislado.
 * Ningún test debe depender de otro archivo de test.
 */

export const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:4100/api/v1';

/** Instancia secundaria con límite de login bajo para probar el 429. */
export const BASE_URL_RATELIMIT = process.env.BASE_URL_RATELIMIT ?? 'http://127.0.0.1:4101/api/v1';

/** Sufijo único por corrida: permite reejecutar sin chocar con datos previos. */
export const RUN_SUFFIX = process.env.RUN_SUFFIX ?? `run${Date.now()}`;

export const CREDENTIALS = {
  admin: {
    identifier: process.env.SEED_ADMIN_IDENTIFIER ?? 'admin',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin#Scienpay2026!',
  },
  generador: {
    identifier: process.env.SEED_GENERADOR_IDENTIFIER ?? 'generador',
    password: process.env.SEED_GENERADOR_PASSWORD ?? 'Coord#Scienpay2026!',
  },
  receptor: {
    identifier: process.env.SEED_RECEPTOR_IDENTIFIER ?? 'receptor',
    password: process.env.SEED_RECEPTOR_PASSWORD ?? 'Finan#Scienpay2026!',
  },
} as const;

export type Role = keyof typeof CREDENTIALS;

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
  text: string;
  setCookies: string[];
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string | null;
  cookie?: string | null;
  body?: unknown;
  baseUrl?: string;
  rawBody?: BodyInit;
  contentType?: string;
}

/** Wrapper de fetch con JSON, token y cookie opcionales. Nunca lanza por HTTP != 2xx. */
export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    token,
    cookie,
    body,
    baseUrl = BASE_URL,
    rawBody,
    contentType = 'application/json',
  } = options;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = contentType;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  const text = await response.text();
  let parsed: T;
  try {
    parsed = (text ? JSON.parse(text) : null) as T;
  } catch {
    parsed = text as unknown as T;
  }

  return {
    status: response.status,
    body: parsed,
    headers: response.headers,
    text,
    setCookies: response.headers.getSetCookie?.() ?? [],
  };
}

export interface Session {
  token: string;
  cookie: string;
  user: { id: string; username: string; email: string; role: string; fullName: string };
}

/** Autentica un rol del seed y devuelve access token + cookie de refresh. */
export async function login(role: Role, baseUrl = BASE_URL): Promise<Session> {
  const credentials = CREDENTIALS[role];
  const response = await api<{
    accessToken: string;
    user: Session['user'];
    message: string;
  }>('/auth/login', { method: 'POST', body: credentials, baseUrl });

  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(
      `[integration] Login ${role} falló (${response.status}): ${response.text.slice(0, 300)}`,
    );
  }

  const refreshCookie = response.setCookies.find((value) => value.startsWith('scienpay_refresh='));
  const cookie = refreshCookie ? refreshCookie.split(';')[0] : '';

  return { token: response.body.accessToken, cookie, user: response.body.user };
}

/** Sesiones memoizadas por proceso de test para no gastar intentos de login. */
const sessionCache = new Map<string, Promise<Session>>();

export function session(role: Role, baseUrl = BASE_URL): Promise<Session> {
  const key = `${role}:${baseUrl}`;
  if (!sessionCache.has(key)) {
    sessionCache.set(key, login(role, baseUrl));
  }
  return sessionCache.get(key) as Promise<Session>;
}

export function bearer(token: string): { token: string } {
  return { token };
}
