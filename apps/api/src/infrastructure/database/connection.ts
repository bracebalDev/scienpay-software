import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export function createDatabaseConnection(connectionUrl?: string) {
  const url =
    connectionUrl ||
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DATABASE_USER || 'scienpay_app'}:${process.env.DATABASE_PASSWORD || 'scienpay_dev_password_change_me'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'scienpay_db'}`;

  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });

  return { client, db };
}
