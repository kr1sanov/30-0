import { spawn } from 'node:child_process';

const args = process.argv.slice(2)
  .filter((arg) => arg !== '--strictPort')
  .map((arg) => arg === '--host' ? '-H' : arg);
const next = spawn('next', ['dev', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });

next.on('exit', (code) => process.exit(code ?? 1));
next.on('error', (error) => {
  console.error('Failed to start Next.js development server:', error);
  process.exit(1);
});
