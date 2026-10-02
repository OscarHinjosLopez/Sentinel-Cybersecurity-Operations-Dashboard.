import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Angular CLI uses --watch=false for the Vitest single-run mode.
const args = process.argv.slice(2).map((arg) => (arg === '--run' ? '--watch=false' : arg));
const cli = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'test', ...args], { stdio: 'inherit' });
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
