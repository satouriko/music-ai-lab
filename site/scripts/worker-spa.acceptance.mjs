import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const workerConfig = join(siteRoot, 'dist/server/wrangler.json');
const wranglerBin = join(
  siteRoot,
  'node_modules/.bin',
  process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
);

const pause = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return address.port;
}

async function waitForWorker(baseUrl, worker, readOutput) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (worker.exitCode !== null) {
      throw new Error(`Wrangler exited before becoming ready:\n${readOutput()}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Wrangler has not opened the port yet.
    }
    await pause(100);
  }
  throw new Error(`Wrangler did not become ready:\n${readOutput()}`);
}

async function runBrowserAcceptance(baseUrl) {
  const child = spawn(process.execPath, ['scripts/spa-navigation.acceptance.mjs'], {
    cwd: siteRoot,
    env: { ...process.env, SITE_URL: baseUrl },
    stdio: 'inherit',
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(exitCode, 0, 'SPA acceptance failed against the built Worker');
}

async function assertDocumentDispatch(baseUrl) {
  const response = await fetch(baseUrl, { redirect: 'manual' });
  assert.equal(response.status, 200, 'root document must not redirect to an internal asset');
  assert.match(
    response.headers.get('content-type') ?? '',
    /^text\/html\b/,
    'root document must retain its HTML content type',
  );
  assert.equal(response.headers.get('location'), null);
}

await access(workerConfig);
const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const worker = spawn(wranglerBin, [
  'dev',
  '--config',
  workerConfig,
  '--port',
  String(port),
  '--local',
], {
  cwd: siteRoot,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let workerOutput = '';
for (const stream of [worker.stdout, worker.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    workerOutput += chunk;
  });
}

try {
  await waitForWorker(baseUrl, worker, () => workerOutput);
  await assertDocumentDispatch(baseUrl);
  await runBrowserAcceptance(baseUrl);
  process.stdout.write('Worker SPA acceptance passed: cached RSC requests preserve navigation.\n');
} finally {
  if (worker.exitCode === null) worker.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => worker.once('exit', resolve)),
    pause(2_000),
  ]);
}
