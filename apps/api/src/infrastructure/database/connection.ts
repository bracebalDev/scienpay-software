import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export interface DatabaseSettings {
  max: number;
  prepare: boolean;
  connectTimeout: number;
  idleTimeout: number;
}

function defaultConnectionUrl(environment: NodeJS.ProcessEnv): string {
  return `postgresql://${environment.DATABASE_USER || 'scienpay_app'}:${environment.DATABASE_PASSWORD || 'scienpay_dev_password_change_me'}@${environment.DATABASE_HOST || 'localhost'}:${environment.DATABASE_PORT || 5432}/${environment.DATABASE_NAME || 'scienpay_db'}`;
}

export function resolveDatabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
  direct = false,
): string {
  if (direct && environment.MIGRATION_DATABASE_URL) {
    return environment.MIGRATION_DATABASE_URL;
  }
  return environment.DATABASE_URL || defaultConnectionUrl(environment);
}

export function resolveDatabaseSettings(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseSettings {
  const parsedMaxConnections = Number.parseInt(environment.DATABASE_MAX_CONNECTIONS ?? '', 10);
  const defaultMax = environment.VERCEL ? 5 : 20;
  const max =
    Number.isFinite(parsedMaxConnections) && parsedMaxConnections > 0
      ? parsedMaxConnections
      : defaultMax;

  const url = environment.DATABASE_URL || '';
  const isPooler =
    url.includes('pooler') ||
    url.includes(':6543') ||
    url.includes('pgbouncer') ||
    url.includes('-pooler.');

  const prepare =
    environment.DATABASE_PREPARE !== undefined
      ? environment.DATABASE_PREPARE !== 'false'
      : !isPooler;

  return {
    max,
    prepare,
    connectTimeout: 15,
    idleTimeout: 30,
  };
}

export function shouldRequireSsl(
  connectionUrl: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (environment.DATABASE_SSL === 'false') return false;
  if (environment.DATABASE_SSL === 'true' || environment.DATABASE_SSL === 'require') return true;
  return (
    environment.NODE_ENV === 'production' &&
    !connectionUrl.includes('localhost') &&
    !connectionUrl.includes('127.0.0.1')
  );
}

export function createDatabaseConnection(
  connectionUrl: string = resolveDatabaseUrl(),
  settings: DatabaseSettings = resolveDatabaseSettings(),
) {
  const requiresSsl = shouldRequireSsl(connectionUrl);
  const client = postgres(connectionUrl, {
    max: settings.max,
    prepare: settings.prepare,
    connect_timeout: settings.connectTimeout,
    idle_timeout: settings.idleTimeout,
    ssl: requiresSsl ? 'require' : undefined,
  });
  const db = drizzle(client, { schema });

  return { client, db };
}

export function createMigrationDatabaseConnection() {
  return createDatabaseConnection(resolveDatabaseUrl(process.env, true), {
    ...resolveDatabaseSettings(),
    max: 1,
  });
}
