#!/usr/bin/env node
/**
 * Runner de la suite de integración (HANDOFF 4.1).
 *
 * 1. Comprueba que el PostgreSQL de integración esté disponible.
 * 2. Aplica migraciones y siembra si la base está vacía (helpers/bootstrap.ts).
 * 3. Arranca la API compilada en dos instancias:
 *      - 4100: límite de login alto (suite general).
 *      - 4101: límite de login bajo (prueba del 429).
 * 4. Espera `/health` en ambas y ejecuta `tsx --test` en serie.
 * 5. Detiene las instancias y propaga el código de salida.
 *
 * Variables relevantes:
 *   INTEGRATION_DB_*      credenciales del contenedor docker-compose.test.yml
 *   INTEGRATION_FRESH=1   recrea el esquema public antes de migrar
 *   INTEGRATION_PORT      puerto de la API principal (4100)
 *   INTEGRATION_RL_PORT   puerto de la API con rate limit bajo (4101)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();
const apiRoot = existsSync(join(cwd, 'dist', 'main.js')) ? cwd : join(cwd, 'apps', 'api');
const repoRoot = existsSync(join(apiRoot, '..', '..', 'package.json'))
  ? join(apiRoot, '..', '..')
  : cwd;

const dbPort = process.env.INTEGRATION_DB_PORT ?? '55432';
const dbName = process.env.INTEGRATION_DB_NAME ?? 'scienpay_test';
const dbUser = process.env.INTEGRATION_DB_USER ?? 'scienpay_app';
const dbPassword = process.env.INTEGRATION_DB_PASSWORD ?? 'scienpay_test_password';

const DATABASE_URL =
  process.env.DATABASE_URL ?? `postgresql://${dbUser}:${dbPassword}@127.0.0.1:${dbPort}/${dbName}`;

const mainPort = process.env.INTEGRATION_PORT ?? '4100';
const rateLimitPort = process.env.INTEGRATION_RL_PORT ?? '4101';
const BASE_URL = `http://127.0.0.1:${mainPort}/api/v1`;
const BASE_URL_RATELIMIT = `http://127.0.0.1:${rateLimitPort}/api/v1`;
const RUN_SUFFIX = process.env.RUN_SUFFIX ?? `run${Date.now()}`;

const baseEnv = {
  ...process.env,
  DATABASE_URL,
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: dbPort,
  DATABASE_NAME: dbName,
  DATABASE_USER: dbUser,
  DATABASE_PASSWORD: dbPassword,
  NODE_ENV: 'test',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ??
    'integration_access_secret_scienpay_minimum_64_characters_super_secure_0001',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    'integration_refresh_secret_scienpay_minimum_64_characters_super_secure_0002',
  COOKIE_SECRET:
    process.env.COOKIE_SECRET ??
    'integration_cookie_secret_scienpay_super_secure_key_abcdef_987654321',
};

const tsxCli = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function log(message) {
  console.log(`[integration] ${message}`);
}

function tail(buffer) {
  const lines = buffer.toString().split(/\r?\n/).filter(Boolean);
  return lines.slice(-25).join('\n');
}

async function waitForHealth(url, attempts = 60) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {
      // La API todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`La API no respondió /health en ${url}`);
}

function startApi({ port, rateLimitMax, label }) {
  const child = spawn(process.execPath, [join(apiRoot, 'dist', 'main.js')], {
    cwd: apiRoot,
    env: {
      ...baseEnv,
      PORT: port,
      AUTH_RATE_LIMIT_MAX: rateLimitMax,
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-8000);
  });
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8000);
  });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[integration] ${label} terminó con código ${code}`);
      console.error(tail(stderr + stdout));
    }
  });

  return child;
}

function stopApi(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function run(command, args, env) {
  return spawnSync(process.execPath, args, {
    cwd: apiRoot,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
}

async function main() {
  if (!existsSync(join(apiRoot, 'dist', 'main.js'))) {
    throw new Error('Falta apps/api/dist/main.js. Ejecuta el build antes de la integración.');
  }
  if (!existsSync(tsxCli)) {
    throw new Error(`No se encontró tsx en ${tsxCli}. Ejecuta npm install.`);
  }

  log(`Base de datos: ${DATABASE_URL}`);
  log(
    `Bootstrap (migraciones + seed)${process.env.INTEGRATION_FRESH === '1' ? ' con reset' : ''}…`,
  );
  const bootstrap = run('tsx', [tsxCli, join(apiRoot, 'test', 'helpers', 'bootstrap.ts')], baseEnv);
  if (bootstrap.status !== 0) {
    throw new Error(`El bootstrap falló con código ${bootstrap.status}`);
  }

  log('Arrancando API principal (límite de login alto)…');
  const mainApi = startApi({ port: mainPort, rateLimitMax: '1000000', label: 'api-main' });

  log('Arrancando API de rate limit (límite de login bajo)…');
  const rateLimitApi = startApi({ port: rateLimitPort, rateLimitMax: '2', label: 'api-ratelimit' });

  try {
    await Promise.all([waitForHealth(BASE_URL), waitForHealth(BASE_URL_RATELIMIT)]);
    log('APIs listas. Ejecutando suite de integración…');

    const result = spawnSync(
      process.execPath,
      [tsxCli, '--test', '--test-concurrency=1', 'test/integration/**/*.test.ts'],
      {
        cwd: apiRoot,
        env: { ...baseEnv, BASE_URL, BASE_URL_RATELIMIT, RUN_SUFFIX },
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    return result.status ?? 1;
  } finally {
    stopApi(mainApi);
    stopApi(rateLimitApi);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`[integration] ${error.message}`);
    process.exit(1);
  });
