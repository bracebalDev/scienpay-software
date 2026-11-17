import { spawnSync } from 'node:child_process';

// Eliminar variables de entorno no estándar inyectadas por el entorno de build de Vercel
// que provocan warnings de configuración desconocida en npm 11+ (Node 26).
delete process.env.npm_config_cache_dir;
delete process.env.NPM_CONFIG_CACHE_DIR;

const [command, ...rawArgs] = process.argv.slice(2);
if (!command) {
  console.error('Uso: node scripts/vercel-runner.mjs <comando> [...argumentos]');
  process.exit(1);
}

const args = [...rawArgs];

// Si se ejecuta npm install o npm ci en Vercel, garantizar que devDependencies (como TypeScript y Vite)
// se instalen y no sean removidas por NODE_ENV=production durante la fase de compilación
if (command === 'npm' && (args[0] === 'install' || args[0] === 'ci' || args[0] === 'i')) {
  process.env.NODE_ENV = 'development';
  if (!args.some((arg) => arg.startsWith('--include'))) {
    args.push('--include=dev');
  }
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
