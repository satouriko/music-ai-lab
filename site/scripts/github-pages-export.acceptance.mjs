import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));
const basePath = '/music-ai-lab';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function pageFile(pathname) {
  const relative = pathname === '/' ? '' : pathname.replace(/^\/+|\/+$/g, '');
  return join(clientRoot, relative, 'index.html');
}

async function assertPage(pathname) {
  const file = pageFile(pathname);
  assert.equal((await stat(file)).isFile(), true, `${pathname} has no index.html`);
  const html = await readFile(file, 'utf8');
  assert.match(html, /<html/i, `${pathname} is not a prerendered document`);
  return html;
}

await access(clientRoot);
assert.equal(
  (await stat(join(clientRoot, '.nojekyll')).catch(() => undefined))?.isFile(),
  true,
  '.nojekyll is missing from the Pages artifact',
);

const rootHtml = await assertPage('/');
let detailHtml;
let week36Html;
for (const pathname of [
  '/roadmap',
  '/notes',
  '/code',
  '/notebooks',
  '/artifacts/weekly-2026-w34',
  '/artifacts/weekly-2026-w36',
  '/artifacts/environment-check',
  '/code/learning/00-environment/test_environment_check.py',
  '/notes/docs/weekly/2026-W34.md',
]) {
  const html = await assertPage(pathname);
  if (pathname === '/artifacts/weekly-2026-w34') detailHtml = html;
  if (pathname === '/artifacts/weekly-2026-w36') week36Html = html;
}

assert.match(rootHtml, /(?:href|src)="\/music-ai-lab\/_next\//);
assert.match(rootHtml, /href="\/music-ai-lab\/artifacts\/weekly-2026-w34"/);
assert.doesNotMatch(rootHtml, /href="[^"]*#\//, 'site must not use hash routing');
assert.match(
  rootHtml,
  /https:\/\/satouriko\.github\.io\/music-ai-lab\/music-ai-roadmap-og\.png/,
);
assert.match(
  detailHtml,
  /https:\/\/satouriko\.github\.io\/music-ai-lab\/music-ai-roadmap-og\.png/,
  'detail metadata must keep the Pages base path in social image URLs',
);
assert.doesNotMatch(
  week36Html,
  /unresolved-link/,
  'the W36 note contains links that are unavailable on GitHub Pages',
);

const outputFiles = await collectFiles(clientRoot);
assert.equal(
  outputFiles.some((file) => file.endsWith('.txt')),
  true,
  'static navigation payloads are missing from the Pages artifact',
);

function requestFile(pathname) {
  if (!pathname.startsWith(`${basePath}/`)) return undefined;
  const relative = decodeURIComponent(pathname.slice(basePath.length + 1));
  const candidate = pathname.endsWith('/')
    ? join(clientRoot, relative, 'index.html')
    : join(clientRoot, relative);
  const normalized = normalize(candidate);
  if (!normalized.startsWith(clientRoot)) return undefined;
  return normalized;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const file = requestFile(url.pathname);
    if (!file || !(await stat(file).catch(() => undefined))?.isFile()) {
      response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      response.end(await readFile(join(clientRoot, '404.html')));
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
    });
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
  const child = spawn(
    process.execPath,
    ['scripts/github-pages-navigation.acceptance.mjs'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: {
        ...process.env,
        SITE_URL: `http://127.0.0.1:${address.port}${basePath}/`,
      },
      stdio: 'inherit',
    },
  );
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(exitCode, 0, 'browser acceptance failed against Pages output');
  process.stdout.write('GitHub Pages export acceptance passed.\n');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
