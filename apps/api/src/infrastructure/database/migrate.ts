import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(maxRetries = 6, delayMs = 3000) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const { client } = createDatabaseConnection();
    console.log(`[Scienpay Migration] (Intento ${attempt}/${maxRetries}) Conectando y aplicando migraciones...`);

    try {
      let migrationFile = path.join(__dirname, 'migrations', '0001_initial_schema_and_triggers.sql');
      if (!fs.existsSync(migrationFile)) {
        const fallbackSrc = path.join(
          __dirname,
          '../../src/infrastructure/database/migrations',
          '0001_initial_schema_and_triggers.sql',
        );
        if (fs.existsSync(fallbackSrc)) {
          migrationFile = fallbackSrc;
        }
      }
      const sqlContent = fs.readFileSync(migrationFile, 'utf8');

      await client.unsafe(sqlContent);
      console.log('[Scienpay Migration] ¡Migración 0001 aplicada exitosamente!');
      await client.end();
      return;
    } catch (err) {
      console.error(`[Scienpay Migration] Intento ${attempt} falló:`, err);
      try {
        await client.end();
      } catch {
        // Ignorar error al cerrar cliente fallido
      }

      if (attempt >= maxRetries) {
        throw err;
      }
      console.log(`[Scienpay Migration] Reintentando en ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations().catch(() => process.exit(1));
}
