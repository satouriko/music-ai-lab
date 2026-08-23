import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseUrl = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
const chromeBinary = process.env.CHROME_BIN ?? '/usr/bin/google-chrome';
const profile = mkdtempSync(join(tmpdir(), 'music-ai-spa-navigation-'));
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

async function waitForActivePort() {
  const activePortPath = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      return readFileSync(activePortPath, 'utf8').trim().split('\n')[0];
    } catch {
      await pause(50);
    }
  }
  throw new Error('Chrome DevTools port did not become ready');
}

async function run() {
  const port = await waitForActivePort();
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
  const consoleMessages = [];
  const navigationRequests = [];

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
    if (message.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(message.params.args.map((argument) => (
        argument.value ?? argument.description ?? ''
      )).join(' '));
    }
    if (message.method === 'Network.responseReceived') {
      const { response } = message.params;
      if (response.url.startsWith(baseUrl)) {
        navigationRequests.push({
          mimeType: response.mimeType,
          status: response.status,
          url: response.url,
        });
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

  async function waitForHydratedLink(selector, name) {
    await waitFor(
      `(() => {
        const link = document.querySelector(${JSON.stringify(selector)});
        return Boolean(link && Object.keys(link).some((key) => key.startsWith('__reactProps$')));
      })()`,
      `${name} link did not hydrate`,
    );
  }

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  if (process.env.SITE_AUTHORIZATION) {
    await call('Network.setExtraHTTPHeaders', {
      headers: {
        'OAI-Sites-Authorization': process.env.SITE_AUTHORIZATION,
      },
    });
  }

  const cases = [
    {
      name: 'note',
      selector: 'a[href="/artifacts/weekly-2026-w34"]',
      pathname: '/artifacts/weekly-2026-w34',
    },
    {
      name: 'exercise',
      selector: 'a[href="/artifacts/environment-check"]',
      pathname: '/artifacts/environment-check',
    },
  ];

  for (const testCase of cases) {
    await call('Page.navigate', { url: new URL('/', baseUrl).href });
    await waitFor(
      `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(testCase.selector)}))`,
      `${testCase.name} link did not render`,
    );
    await waitForHydratedLink(testCase.selector, testCase.name);

    const marker = `spa-${testCase.name}-${Date.now()}`;
    await evaluate(`window.__MUSIC_AI_SPA_MARKER__ = ${JSON.stringify(marker)}`);
    await evaluate(`document.querySelector(${JSON.stringify(testCase.selector)}).click()`);
    await waitFor(
      `location.pathname === ${JSON.stringify(testCase.pathname)} && Boolean(document.querySelector('.artifact-page'))`,
      `${testCase.name} did not navigate to its artifact page`,
    );

    assert.equal(
      await evaluate('window.__MUSIC_AI_SPA_MARKER__'),
      marker,
      `${testCase.name} replaced the document instead of using SPA navigation:\n${JSON.stringify({ consoleMessages, exceptions, navigationRequests }, null, 2)}`,
    );
  }

  const testFilePath = '/code/learning/00-environment/test_environment_check.py';
  const testFileSelector = `a[href="${testFilePath}"]`;
  await call('Page.navigate', {
    url: new URL('/artifacts/environment-check', baseUrl).href,
  });
  await waitFor(
    `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(testFileSelector)}))`,
    'exercise test-file link did not render as a static code route',
  );
  await waitForHydratedLink(testFileSelector, 'exercise test-file');
  const codeMarker = `spa-code-${Date.now()}`;
  await evaluate(`window.__MUSIC_AI_SPA_MARKER__ = ${JSON.stringify(codeMarker)}`);
  await evaluate(`document.querySelector(${JSON.stringify(testFileSelector)}).click()`);
  await waitFor(
    `location.pathname === ${JSON.stringify(testFilePath)} && Boolean(document.querySelector('.artifact-file-index'))`,
    'test file did not navigate while preserving the exercise directory',
  );
  assert.equal(
    await evaluate('window.__MUSIC_AI_SPA_MARKER__'),
    codeMarker,
    `test file replaced the document instead of using SPA navigation:\n${JSON.stringify({ consoleMessages, navigationRequests }, null, 2)}`,
  );
  assert.equal(
    await evaluate(`document.querySelector('.artifact-entry-code header code')?.textContent`),
    'learning/00-environment/test_environment_check.py',
  );

  await call('Page.navigate', { url: new URL('/', baseUrl).href });
  await waitFor(
    "document.readyState === 'complete' && Boolean(document.querySelector('.phase-filter'))",
    'roadmap phase filter did not render',
  );
  assert.deepEqual(
    await evaluate(`({
      duplicatePhaseJumps: document.querySelectorAll('.phase-jumps').length,
      phaseFilters: document.querySelectorAll('.phase-filter').length,
    })`),
    { duplicatePhaseJumps: 0, phaseFilters: 1 },
  );
  assert.deepEqual(exceptions, [], `browser exceptions: ${exceptions.join('\n')}`);

  socket.close();
  process.stdout.write('SPA navigation acceptance passed: note, exercise, code file, and phase controls.\n');
}

try {
  await run();
} finally {
  chrome.kill('SIGTERM');
  await pause(150);
  rmSync(profile, { recursive: true, force: true });
}
