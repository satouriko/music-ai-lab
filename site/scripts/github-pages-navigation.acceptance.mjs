import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { waitForActivePort } from './chrome-devtools.mjs';

const baseUrl = process.env.SITE_URL;
assert.ok(baseUrl, 'SITE_URL is required');

const chromeBinary = process.env.CHROME_BIN ?? '/usr/bin/google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'music-ai-pages-navigation-'));
const chrome = spawn(chromeBinary, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--window-size=1440,1000',
  'about:blank',
], { stdio: 'ignore' });

const pause = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

async function run() {
  const port = await waitForActivePort(join(profile, 'DevToolsActivePort'));
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((response) => response.json());
  const page = targets.find((target) => target.type === 'page');
  assert.ok(page, 'Chrome did not expose a page target');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const exceptions = [];
  const requests = [];
  const responses = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(
        message.params.exceptionDetails.exception?.description
          ?? message.params.exceptionDetails.text,
      );
    }
    if (message.method === 'Network.requestWillBeSent') {
      const { request } = message.params;
      if (request.url.startsWith(baseUrl)) {
        requests.push({ headers: request.headers, url: request.url });
      }
    }
    if (message.method === 'Network.responseReceived') {
      const { response } = message.params;
      if (response.url.startsWith(baseUrl)) {
        responses.push({ status: response.status, url: response.url });
      }
    }
  });

  function call(method, params = {}) {
    nextId += 1;
    return new Promise((resolve, reject) => {
      pending.set(nextId, { resolve, reject });
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description
          ?? result.exceptionDetails.text,
      );
    }
    return result.result.value;
  }

  async function waitFor(expression, message) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await evaluate(expression)) return;
      await pause(100);
    }
    throw new Error(message);
  }

  async function verifyDocumentNavigation({ from, href, pageSelector }) {
    await call('Page.navigate', { url: new URL(from, baseUrl).href });
    await waitFor(
      `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(`a[href="${href}"]`)}))`,
      `link ${href} did not render`,
    );

    const marker = `document-${Date.now()}-${href}`;
    await evaluate(`window.__MUSIC_AI_DOCUMENT_MARKER__ = ${JSON.stringify(marker)}`);
    await evaluate(`document.querySelector(${JSON.stringify(`a[href="${href}"]`)}).click()`);
    await waitFor(
      `location.pathname === ${JSON.stringify(href)} && Boolean(document.querySelector(${JSON.stringify(pageSelector)}))`,
      `${href} did not load its static document`,
    );
    assert.equal(
      await evaluate('window.__MUSIC_AI_DOCUMENT_MARKER__'),
      undefined,
      `${href} attempted RSC navigation instead of loading its static HTML document`,
    );
  }

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');

  await verifyDocumentNavigation({
    from: '',
    href: '/music-ai-lab/artifacts/weekly-2026-w34/',
    pageSelector: '.artifact-page',
  });
  await verifyDocumentNavigation({
    from: '',
    href: '/music-ai-lab/artifacts/environment-check/',
    pageSelector: '.artifact-page',
  });
  await verifyDocumentNavigation({
    from: 'artifacts/environment-check/',
    href: '/music-ai-lab/code/learning/00-environment/test_environment_check.py/',
    pageSelector: '.artifact-file-index',
  });

  await call('Page.navigate', { url: baseUrl });
  await waitFor(
    "document.readyState === 'complete' && Boolean(document.querySelector('.phase-filter'))",
    'roadmap phase filter did not render',
  );

  assert.deepEqual(exceptions, [], `browser exceptions: ${exceptions.join('\n')}`);
  assert.equal(
    responses.some(({ status }) => status >= 400),
    false,
    `browser requests failed:\n${JSON.stringify(responses, null, 2)}`,
  );
  assert.equal(
    requests.some(({ headers, url }) => (
      new URL(url).searchParams.has('_rsc')
      || Object.entries(headers).some(([name, value]) => (
        name.toLowerCase() === 'rsc' && String(value) === '1'
      ))
    )),
    false,
    `GitHub Pages navigation attempted unsupported RSC requests:\n${JSON.stringify(requests, null, 2)}`,
  );

  socket.close();
  process.stdout.write('GitHub Pages navigation acceptance passed.\n');
}

try {
  await run();
} finally {
  chrome.kill('SIGTERM');
  await pause(150);
  rmSync(profile, { recursive: true, force: true });
}
