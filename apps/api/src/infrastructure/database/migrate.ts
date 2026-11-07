import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabaseConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveMigrationsDirectory(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '../../src/infrastructure/database/migrations'),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('MIGRACIONES_NO_ENCONTRADAS: No se encontró el directorio de migraciones');
  }
  return found;
}

export async function runMigrations() {
  const { client } = createDatabaseConnection();
  const migrationsDirectory = resolveMigrationsDirectory();
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  console.log(
    `[Scienpay Migration] Aplicando ${migrationFiles.length} migraciones de base de datos y triggers...`,
  );

  try {
    for (const migrationFile of migrationFiles) {
      const fullPath = path.join(migrationsDirectory, migrationFile);
      const sqlContent = fs.readFileSync(fullPath, 'utf8');
      await client.unsafe(sqlContent);
      console.log(`[Scienpay Migration] ${migrationFile} aplicada exitosamente`);
    }
    console.log('[Scienpay Migration] Todas las migraciones fueron aplicadas');
  } catch (err) {
    console.error('[Scienpay Migration] Error al aplicar migraciones:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.includes('migrate')) {
  runMigrations().catch(() => process.exit(1));
}
