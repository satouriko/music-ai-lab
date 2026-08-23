import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.rsc': 'text/x-component',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function routeCandidates(pathname) {
  const relative = pathname === '/' ? 'index' : pathname.replace(/^\/+|\/+$/g, '');
  return [`${relative}.document.html`, join(relative, 'index.document.html')];
}

function publicHtmlCandidates(pathname) {
  const relative = pathname === '/' ? 'index' : pathname.replace(/^\/+|\/+$/g, '');
  return [`${relative}.html`, join(relative, 'index.html')];
}

async function firstFile(candidates) {
  for (const relativePath of candidates) {
    const absolutePath = join(clientRoot, normalize(relativePath));
    if (!absolutePath.startsWith(clientRoot)) continue;
    try {
      if ((await stat(absolutePath)).isFile()) return absolutePath;
    } catch {
      // Try the next static-host-compatible route shape.
    }
  }
  return undefined;
}

async function assertPrerendered(pathname) {
  const page = await firstFile(routeCandidates(pathname));
  assert.ok(page, `${pathname} was not emitted as an internal static document`);
  assert.equal(
    await firstFile(publicHtmlCandidates(pathname)),
    undefined,
    `${pathname} still exposes HTML that can bypass the Worker`,
  );
  const html = await readFile(page, 'utf8');
  assert.match(html, /<html/i, `${pathname} does not contain a prerendered document`);
}

async function readRscCompatibilityId() {
  const chunksRoot = join(clientRoot, '_next/static/chunks');
  const vinextChunk = (await readdir(chunksRoot)).find((name) => /^vinext-.*\.js$/.test(name));
  assert.ok(vinextChunk, 'Vinext client chunk was not emitted');
  const source = await readFile(join(chunksRoot, vinextChunk), 'utf8');
  const compatibilityId = source.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/,
  )?.[0];
  assert.ok(compatibilityId, 'Vinext RSC compatibility ID was not embedded in the client');
  return compatibilityId;
}

async function runBrowserAcceptance(baseUrl) {
  const child = spawn(process.execPath, ['scripts/spa-navigation.acceptance.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, SITE_URL: baseUrl },
    stdio: 'inherit',
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(exitCode, 0, 'SPA acceptance failed against static files');
}

await access(clientRoot);
const rscCompatibilityId = await readRscCompatibilityId();
for (const pathname of [
  '/',
  '/notes',
  '/code',
  '/notebooks',
  '/artifacts/weekly-2026-w34',
  '/artifacts/environment-check',
  '/code/learning/00-environment/test_environment_check.py',
  '/notes/docs/weekly/2026-W34.md',
]) {
  await assertPrerendered(pathname);
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(requestUrl.pathname);
    const candidates = requestUrl.searchParams.has('_rsc')
      ? [`${pathname === '/' ? 'index' : pathname.replace(/^\/+/, '')}.rsc`]
      : [pathname.replace(/^\/+/, ''), ...routeCandidates(pathname)];
    const file = await firstFile(candidates);
    if (!file) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.setHeader('content-type', contentTypes[extname(file)] ?? 'application/octet-stream');
    if (extname(file) === '.rsc') {
      response.setHeader('X-Vinext-RSC-Compatibility-Id', rscCompatibilityId);
    }
    response.end(await readFile(file));
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  await runBrowserAcceptance(`http://127.0.0.1:${address.port}`);
  process.stdout.write('Static export acceptance passed: prerendered routes and SPA navigation.\n');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
