#!/usr/bin/env node
/**
 * Verifica que todos los workspaces declaren un script `lint`.
 * Se ejecuta antes de `npm run lint` en la raíz para evitar que un workspace
 * nuevo quede fuera del pipeline de calidad sin que nadie lo note.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['apps', 'packages'];
const missing = [];

for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(root, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!manifest.scripts?.lint) {
      missing.push(`${root}/${entry.name}`);
    }
  }
}

if (missing.length > 0) {
  console.error('[Scienpay Lint] Workspaces sin script "lint":');
  for (const name of missing) console.error(`  - ${name}`);
  process.exit(1);
}

console.log('[Scienpay Lint] Todos los workspaces declaran su script "lint".');
