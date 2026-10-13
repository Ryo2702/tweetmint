import { request } from 'node:http';
import { spawn } from 'node:child_process';

export function probeTweetMintApi({ host = '127.0.0.1', port = 8787, timeoutMs = 750 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (healthy) => {
      if (settled) return;
      settled = true;
      resolve(healthy);
    };
    const apiRequest = request({ host, port, path: '/api/feed/stats', headers: { Accept: 'application/json' }, timeout: timeoutMs }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const stats = JSON.parse(body);
          finish(response.statusCode === 200 && Number.isFinite(stats.articlesToday));
        } catch {
          finish(false);
        }
      });
    });
    apiRequest.on('error', () => finish(false));
    apiRequest.on('timeout', () => { apiRequest.destroy(); finish(false); });
    apiRequest.end();
  });
}

const apiHost = process.env.HOST && !['0.0.0.0', '::'].includes(process.env.HOST) ? process.env.HOST : '127.0.0.1';
const apiPort = Number(process.env.PORT) || 8787;
const apiAlreadyRunning = await probeTweetMintApi({ host: apiHost, port: apiPort });
if (apiAlreadyRunning) console.log(`TweetMint API already running on http://${apiHost}:${apiPort}; reusing it.`);

const backend = apiAlreadyRunning ? null : spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.js'], { stdio: 'inherit' });
const children = [backend, spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)], { stdio: 'inherit' })].filter(Boolean);
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(); process.exitCode = 1; });
  child.on('exit', (code) => { stop(); process.exitCode = code || 0; });
}
