#!/usr/bin/env node
/** [LAYER: UI] */
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const api = spawn(process.execPath, ['bin/server.mjs'], { stdio: 'inherit', env: process.env });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'src/ui/web/react/vite.config.ts', '--host', '127.0.0.1'], {
  stdio: 'inherit', env: { ...process.env, CINDER_API_URL: process.env.CINDER_API_URL || `http://localhost:${port}` }
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of [api, vite]) {
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', (code, signal) => { if (!stopping) { console.error(`A CINDER process exited (${signal || code}).`); stop(code || 1); } });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());