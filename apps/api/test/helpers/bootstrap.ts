import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

/**
 * Prepara la base de integración: reseteo opcional, migraciones y seed.
 * Se ejecuta con `tsx` desde `run-integration.mjs` (HANDOFF 4.1).
 */

const DEFAULT_URL =
  'postgresql://scienpay_app:scienpay_test_password@127.0.0.1:55432/scienpay_test';

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_URL;
const fresh = process.env.INTEGRATION_FRESH === '1' || process.argv.includes('--fresh');

function resolveApiRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'dist', 'main.js'))) return cwd;
  const nested = join(cwd, 'apps', 'api');
  if (existsSync(join(nested, 'dist', 'main.js'))) return nested;
  throw new Error(`[bootstrap] No se encontró apps/api/dist/main.js desde ${cwd}`);
}

async function waitForDatabase(attempts = 30, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = postgres(databaseUrl, { max: 1, connect_timeout: 5, onnotice: () => undefined });
    try {
      await client`select 1`;
      await client.end({ timeout: 3 });
      return;
    } catch (error) {
      await client.end({ timeout: 1 }).catch(() => undefined);
      if (attempt === attempts) {
        throw new Error(
          `[bootstrap] PostgreSQL no disponible en ${databaseUrl}: ${(error as Error).message}`,
          { cause: error },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function resetSchema(): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    console.log('[bootstrap] Reseteando esquema public (INTEGRATION_FRESH=1)…');
    await client`drop schema if exists public cascade`;
    await client`create schema public`;
    await client`grant all on schema public to current_user`;
  } finally {
    await client.end({ timeout: 5 });
  }
}

function runScript(script: string, apiRoot: string): void {
  const result = spawnSync(
    process.execPath,
    [join(apiRoot, 'dist', 'infrastructure', 'database', script)],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );
  if (result.status !== 0) {
    throw new Error(`[bootstrap] ${script} terminó con código ${result.status}`);
  }
}

async function countUsers(): Promise<number> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    const rows = await client`select count(*)::int as total from users`;
    return Number((rows[0] as { total: number }).total);
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  const apiRoot = resolveApiRoot();
  await waitForDatabase();

  if (fresh) {
    await resetSchema();
  }

  runScript('migrate.js', apiRoot);

  const users = await countUsers();
  if (users === 0) {
    console.log('[bootstrap] Base vacía: ejecutando seed…');
    runScript('seed.js', apiRoot);
  } else {
    console.log(`[bootstrap] Base ya sembrada (${users} usuarios). Se omite el seed.`);
  }

  console.log('[bootstrap] Base de integración lista.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
