import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const { client } = createDatabaseConnection();
  console.log('[Scienpay Migration] Aplicando migraciones de base de datos y triggers...');

  try {
    let migrationFile = path.join(__dirname, 'migrations', '0001_initial_schema_and_triggers.sql');
    if (!fs.existsSync(migrationFile)) {
      const fallbackSrc = path.join(__dirname, '../../src/infrastructure/database/migrations', '0001_initial_schema_and_triggers.sql');
      if (fs.existsSync(fallbackSrc)) {
        migrationFile = fallbackSrc;
      }
    }
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    await client.unsafe(sqlContent);
    console.log('[Scienpay Migration] ¡Migración 0001 aplicada exitosamente!');
  } catch (err) {
    console.error('[Scienpay Migration] Error al aplicar migración:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations().catch(() => process.exit(1));
}
