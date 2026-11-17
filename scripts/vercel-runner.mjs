import { spawnSync } from 'node:child_process';

// Eliminar variables de entorno no estándar inyectadas por el entorno de build de Vercel
// que provocan warnings de configuración desconocida en npm 11+ (Node 26).
delete process.env.npm_config_cache_dir;
delete process.env.NPM_CONFIG_CACHE_DIR;

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Uso: node scripts/vercel-runner.mjs <comando> [...argumentos]');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const execCommand = isWin && (command === 'npm' || command === 'npx') ? `${command}.cmd` : command;

const result = spawnSync(execCommand, args, {
  stdio: 'inherit',
  env: process.env,
  shell: isWin,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
