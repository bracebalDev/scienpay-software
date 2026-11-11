import postgres from 'postgres';

/**
 * Conexión directa a la base de integración para aserciones SQL.
 * No se usa desde la aplicación: solo desde los tests (HANDOFF 4.1).
 */
const DEFAULT_URL =
  'postgresql://scienpay_app:scienpay_test_password@127.0.0.1:55432/scienpay_test';

export const DATABASE_URL = process.env.DATABASE_URL ?? DEFAULT_URL;

export const sql = postgres(DATABASE_URL, {
  max: 4,
  connect_timeout: 15,
  idle_timeout: 10,
  onnotice: () => undefined,
});

export async function scalar<T = unknown>(query: string, params: unknown[] = []): Promise<T> {
  const rows = await sql.unsafe(query, params as never[]);
  const first = rows[0] as Record<string, unknown> | undefined;
  if (!first) return undefined as T;
  return Object.values(first)[0] as T;
}

export async function closeDatabase(): Promise<void> {
  await sql.end({ timeout: 5 });
}
