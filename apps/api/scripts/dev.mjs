import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runner de desarrollo para la API.
 *
 * `tsx`/esbuild no emiten `design:paramtypes`, por lo que NestJS instancia los
 * controladores sin sus dependencias y todos los endpoints fallan en runtime.
 * Este runner usa `tsc`, que sí emite los metadatos de decoradores, y reinicia
 * el proceso con `node --watch` cuando cambia el JavaScript compilado.
 */

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(currentDirectory, '..');
const tscBin = path.resolve(apiRoot, '../../node_modules/typescript/bin/tsc');

const initialBuild = spawnSync(process.execPath, [tscBin], {
  cwd: apiRoot,
  stdio: 'inherit',
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

const compiler = spawn(process.execPath, [tscBin, '--watch', '--preserveWatchOutput'], {
  cwd: apiRoot,
  stdio: 'inherit',
});

const server = spawn(process.execPath, ['--watch', 'dist/main.js'], {
  cwd: apiRoot,
  stdio: 'inherit',
  env: process.env,
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  compiler.kill(signal);
  server.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

compiler.on('exit', (code) => {
  if (!shuttingDown && code !== 0) {
    shutdown('SIGTERM');
    process.exitCode = code ?? 1;
  }
});

server.on('exit', (code) => {
  if (!shuttingDown) {
    shutdown('SIGTERM');
    process.exitCode = code ?? 0;
  }
});
